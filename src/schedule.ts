import type { Clock, Route, StopStatus } from './types'

// Adapted from 倒垃圾了 core.mjs. These are scheduled times, never truck positions.
const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
export const dayNames = ['日', '一', '二', '三', '四', '五', '六']
export function taipeiNow(now = new Date()): Clock {
  const p = Object.fromEntries(
    formatter.formatToParts(now).map(({ type, value }) => [type, value]),
  )
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    seconds: Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second),
  }
}
export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const value = new Date(`${date}T12:00:00+08:00`)
  return Number.isFinite(value.getTime()) && taipeiNow(value).date === date
}
export function weekday(date: string) {
  return new Date(`${date}T12:00:00+08:00`).getUTCDay()
}
export function timeSeconds(time: string | null) {
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  return Number(time.slice(0, 2)) * 3600 + Number(time.slice(3, 5)) * 60
}
export function formatTime(seconds: number, withSeconds = false) {
  const value = Math.max(0, Math.min(86399, Math.floor(seconds)))
  return [
    Math.floor(value / 3600),
    Math.floor((value % 3600) / 60),
    ...(withSeconds ? [value % 60] : []),
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}
export function countdown(delta: number) {
  const value = Math.max(0, Math.ceil(delta)),
    hours = Math.floor(value / 3600)
  return `${hours ? `${hours}:` : ''}${String(Math.floor((value % 3600) / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
export function getSchedule(route: Route, clock: Clock) {
  const day = weekday(clock.date)
  const stops = route.stops.map((stop) => ({
    ...stop,
    seconds: timeSeconds(stop.time),
    active:
      stop.collectionDays === null ? null : stop.collectionDays.includes(day),
    recycling:
      stop.recyclingDays === null ? null : stop.recyclingDays.includes(day),
  }))
  const timed = stops.filter((stop) => stop.active && stop.seconds !== null)
  // Backwards times stay on the selected civil day. No invented overnight offsets.
  const current = timed.filter(
    (stop) =>
      clock.seconds >= stop.seconds! && clock.seconds < stop.seconds! + 60,
  )
  const upcoming = timed
    .filter((stop) => stop.seconds! > clock.seconds)
    .sort((a, b) => a.seconds! - b.seconds!)
  const next = current[0] ?? upcoming[0] ?? null
  const states: StopStatus[] = stops.map((stop) => {
    if (stop.active === false) return 'inactive'
    if (stop.active === null || stop.seconds === null) return 'unknown'
    if (
      current.some((item) => item.id === stop.id) ||
      (!current.length && stop.seconds === next?.seconds)
    )
      return 'next'
    return clock.seconds >= stop.seconds + 60 ? 'past' : 'future'
  })
  return {
    stops,
    states,
    next,
    now: current.length > 0,
    simultaneous:
      current.length ||
      (next
        ? upcoming.filter((stop) => stop.seconds === next.seconds).length
        : 0),
    activeCount: stops.filter((stop) => stop.active).length,
    unknownCount: states.filter((state) => state === 'unknown').length,
    passed: states.filter((state) => state === 'past').length,
  }
}
export const statusLabels: Record<StopStatus, string> = {
  past: '表定時間已過',
  next: '當前／下一個表定站點',
  future: '尚未到表定時間',
  inactive: '今日無垃圾收運',
  unknown: '班表資料不完整',
}
