import { expect, it } from 'vitest'
import { areaKm2, viewportStops } from './viewport'
import { dataset, route, stop } from './test/fixtures'
import { visibleConnections } from './nearby'
const bounds = { north: 23.102, south: 23.098, east: 120.302, west: 120.298 }
const clock = { date: '2026-11-19', seconds: 18 * 3600 }
it('shows hollow reference stops but connects only each current-to-next pair', () => {
  const result = viewportStops(dataset, bounds, clock, null)
  expect(result).toHaveLength(4)
  expect(result.filter((v) => v.state === 'next' && !v.context)).toHaveLength(1)
  expect(result.filter((v) => v.context)).toHaveLength(2)
  expect(visibleConnections(result.filter((v) => v.connected))).toHaveLength(1)
})
it('hides other routes while selected and restores them on collapse', () => {
  const result = viewportStops(dataset, bounds, clock, route.id)
  expect(result.filter((v) => v.connected)).toHaveLength(3)
  expect(result).toHaveLength(3)
  expect(result.every((v) => v.route.id === route.id)).toBe(true)
  const restored = viewportStops(dataset, bounds, clock, null)
  expect(restored.some((v) => v.route.id !== route.id)).toBe(true)
})
it('hides background stops above 2 square km while keeping the timetable pair', () => {
  const large = { north: 23.12, south: 23.08, east: 120.32, west: 120.28 }
  expect(areaKm2(bounds)).toBeLessThan(2)
  expect(areaKm2(large)).toBeGreaterThan(2)
  expect(viewportStops(dataset, large, clock, null)).toHaveLength(2)
})
it('does not invent active service for an inactive reference stop', () => {
  const sunday = { date: '2026-11-22', seconds: 18 * 3600 }
  expect(
    viewportStops(dataset, bounds, sunday, null).every(
      (v) => v.context && !v.connected,
    ),
  ).toBe(true)
})
it('filters the next civil date independently across midnight', () => {
  const data = {
    ...dataset,
    routes: [
      {
        ...route,
        stops: [
          stop('1', '23:50', { collectionDays: [4] }),
          stop('2', '00:10', { collectionDays: [5] }),
        ],
      },
    ],
  }
  const result = viewportStops(
    data,
    bounds,
    { date: '2026-11-19', seconds: 23 * 3600 + 55 * 60 },
    null,
  )
  expect(result.find((v) => v.state === 'next')?.date).toBe('2026-11-20')
})
