import type { Clock, Dataset } from './types'
import type { Visit } from './nearby'
import { clockTimestamp, distanceMeters } from './nearby'
import { timeSeconds, weekday, taipeiNow } from './schedule'

export interface Bounds {
  north: number
  south: number
  east: number
  west: number
}
export interface MapStop extends Visit {
  connected: boolean
}
export const defaultBounds: Bounds = {
  north: 22.99225,
  south: 22.98775,
  east: 120.20744,
  west: 120.20256,
}
export function areaKm2(b: Bounds) {
  const middle = (b.north + b.south) / 2
  return (
    (distanceMeters(
      { lat: middle, lng: b.west },
      { lat: middle, lng: b.east },
    ) *
      distanceMeters(
        { lat: b.south, lng: b.west },
        { lat: b.north, lng: b.west },
      )) /
    1e6
  )
}
export function inBounds(lat: number, lng: number, b: Bounds) {
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east
}
// Hollow stops are geographic references; only scheduled visits in the forward
// 30-minute window become orange. No inferred GPS or overnight service.
export function viewportStops(
  data: Dataset,
  bounds: Bounds,
  clock: Clock,
  selectedRoute: string | null,
): MapStop[] {
  const now = clockTimestamp(clock),
    end = now + 30 * 60000
  const dates = [clock.date]
  const endDate = taipeiNow(new Date(end)).date
  if (endDate !== clock.date) dates.push(endDate)
  const all = new Map<string, MapStop>()
  const showReferences = areaKm2(bounds) <= 2
  for (const route of data.routes) {
    if (selectedRoute && route.id !== selectedRoute) continue
    const records = dates.flatMap((date) =>
      route.stops.flatMap((stop, index): MapStop[] => {
        if (stop.lat === null || stop.lng === null) return []
        const seconds = timeSeconds(stop.time)
        return [
          {
            id: `${date}/${stop.id}`,
            stop,
            route,
            index,
            date,
            timestamp:
              seconds === null ? NaN : clockTimestamp({ date, seconds }),
            distance: 0,
            state: 'future',
            context: true,
            connected: false,
          },
        ]
      }),
    )
    const anchor = records
      .filter(
        (v) =>
          inBounds(v.stop.lat!, v.stop.lng!, bounds) &&
          v.stop.collectionDays?.includes(weekday(v.date)) &&
          v.timestamp >= now &&
          v.timestamp <= end,
      )
      .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)[0]
    const full = route.id === selectedRoute
    const routeDate = anchor?.date ?? clock.date
    for (const v of records) {
      if (v.date !== routeDate) continue
      if (
        full ||
        (showReferences && inBounds(v.stop.lat!, v.stop.lng!, bounds))
      ) {
        all.set(v.id, { ...v, connected: full })
      }
    }
    if (anchor && (!selectedRoute || full)) {
      all.set(anchor.id, {
        ...anchor,
        state: 'next',
        context: false,
        connected: true,
      })
      const next = records.find(
        (v) => v.date === anchor.date && v.index === anchor.index + 1,
      )
      if (next)
        all.set(next.id, {
          ...next,
          state: 'future',
          context: false,
          connected: true,
        })
    }
  }
  return [...all.values()]
}
