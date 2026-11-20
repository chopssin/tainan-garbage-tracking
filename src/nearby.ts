import type { Clock, Dataset, Route, Stop } from './types'
import { taipeiNow, timeSeconds, weekday } from './schedule'
export interface Location {
  lat: number
  lng: number
}
export interface Visit {
  id: string
  stop: Stop
  route: Route
  index: number
  date: string
  timestamp: number
  distance: number
  context?: boolean
  preview?: boolean
  state: 'past' | 'next' | 'future'
}
export function distanceMeters(a: Location, b: Location) {
  const rad = Math.PI / 180
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}
export function clockTimestamp(clock: Clock) {
  return Date.parse(`${clock.date}T00:00:00+08:00`) + clock.seconds * 1000
}
export function windowLabel(timestamp: number) {
  const c = taipeiNow(new Date(timestamp))
  return `${c.date.slice(5)} ${String(Math.floor(c.seconds / 3600)).padStart(2, '0')}:${String(Math.floor((c.seconds % 3600) / 60)).padStart(2, '0')}`
}
export function nearbyVisits(
  data: Dataset,
  center: Location,
  radius: number,
  clock: Clock,
  minutes: number,
): Visit[] {
  const now = clockTimestamp(clock),
    start = now,
    end = now + minutes * 60000
  const first = taipeiNow(new Date(start)).date,
    last = taipeiNow(new Date(end)).date
  const dates: string[] = []
  for (
    let day = Date.parse(`${first}T00:00:00+08:00`);
    day <= Date.parse(`${last}T00:00:00+08:00`);
    day += 86400000
  )
    dates.push(taipeiNow(new Date(day)).date)
  const visits: Visit[] = []
  for (const route of data.routes) {
    const routeVisits: Visit[] = []
    for (const [index, stop] of route.stops.entries()) {
      const seconds = timeSeconds(stop.time)
      if (
        stop.lat === null ||
        stop.lng === null ||
        seconds === null ||
        !stop.collectionDays
      )
        continue
      const distance = distanceMeters(center, { lat: stop.lat, lng: stop.lng })
      if (distance > radius) continue
      for (const date of dates) {
        if (!stop.collectionDays.includes(weekday(date))) continue
        const timestamp = clockTimestamp({ date, seconds })
        if (timestamp < start || timestamp > end) continue
        routeVisits.push({
          id: `${date}/${stop.id}`,
          stop,
          route,
          index,
          date,
          timestamp,
          distance,
          state: timestamp + 60000 <= now ? 'past' : 'future',
        })
      }
    }
    const next = routeVisits
      .filter((v) => v.timestamp + 60000 > now)
      .sort((a, b) => a.timestamp - b.timestamp)[0]
    for (const v of routeVisits) {
      if (next && v.timestamp === next.timestamp) v.state = 'next'
      visits.push(v)
    }
  }
  return visits.sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      a.distance - b.distance ||
      a.id.localeCompare(b.id),
  )
}
// Only connect adjacent source stops on the same date; hidden stops never leave a bridging line.
export function visibleConnections(visits: Visit[]) {
  const byKey = new Map(
    visits.map((v) => [`${v.route.id}/${v.date}/${v.index}`, v]),
  )
  return visits.flatMap((v) => {
    const previous = byKey.get(`${v.route.id}/${v.date}/${v.index - 1}`)
    return previous ? [[previous, v] as const] : []
  })
}

// Neighbors are source-order context, not additional matching collection visits.
export function mapVisits(
  matches: Visit[],
  center: Location,
  clock: Clock,
  expanded: string | null,
): Visit[] {
  const result: Visit[] = []
  const now = clockTimestamp(clock)
  const byRoute = new Map<string, Visit[]>()
  for (const match of matches) {
    const group = byRoute.get(match.route.id) ?? []
    group.push(match)
    byRoute.set(match.route.id, group)
  }
  for (const group of byRoute.values()) {
    // Exactly one anchor per route, including tied times and midnight windows.
    const anchor = [...group].sort(
      (a, b) => a.timestamp - b.timestamp || a.index - b.index,
    )[0]!
    const full = anchor.route.id === expanded
    const indices = full
      ? anchor.route.stops.map((_, index) => index)
      : [anchor.index - 1, anchor.index, anchor.index + 1]
    for (const index of indices) {
      const stop = anchor.route.stops[index]
      if (!stop || stop.lat === null || stop.lng === null) continue
      const id = `${anchor.date}/${stop.id}`
      const match = group.find((v) => v.id === id)
      const seconds = timeSeconds(stop.time)
      const timestamp =
        seconds === null ? NaN : clockTimestamp({ date: anchor.date, seconds })
      result.push({
        id,
        stop,
        route: anchor.route,
        index,
        date: anchor.date,
        timestamp,
        distance: distanceMeters(center, { lat: stop.lat, lng: stop.lng }),
        state:
          index === anchor.index
            ? 'next'
            : !full
              ? index < anchor.index
                ? 'past'
                : 'future'
              : timestamp + 60000 <= now
                ? 'past'
                : 'future',
        context: !match,
        preview: !full,
      })
    }
  }
  return result
}
