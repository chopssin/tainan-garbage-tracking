import { expect, it } from 'vitest'
import { nearbyVisits, visibleConnections, distanceMeters } from './nearby'
import { dataset, route, stop } from './test/fixtures'
const center = { lat: 23.1, lng: 120.3 }
it('filters every route by location, date and inclusive time boundaries', () => {
  const visits = nearbyVisits(
    dataset,
    center,
    1000,
    { date: '2026-11-19', seconds: 18 * 3600 },
    60,
  )
  expect(visits).toHaveLength(4)
  expect(new Set(visits.map((v) => v.route.id)).size).toBe(2)
  expect(
    nearbyVisits(
      dataset,
      { lat: 25, lng: 121 },
      1000,
      { date: '2026-11-19', seconds: 18 * 3600 },
      60,
    ),
  ).toEqual([])
  expect(
    nearbyVisits(
      dataset,
      center,
      1000,
      { date: '2026-11-22', seconds: 18 * 3600 },
      60,
    ),
  ).toEqual([])
  expect(
    nearbyVisits(
      dataset,
      center,
      1000,
      { date: '2026-11-19', seconds: 18 * 3600 },
      15,
    ),
  ).toHaveLength(3)
})
it('uses each civil date weekday when a window crosses midnight', () => {
  const data = {
    ...dataset,
    routes: [
      {
        ...route,
        stops: [
          stop('1', '23:50', { collectionDays: [4] }),
          stop('2', '00:10', { collectionDays: [5] }),
          stop('3', '00:20', { collectionDays: [4] }),
        ],
      },
    ],
  }
  const result = nearbyVisits(
    data,
    center,
    1000,
    { date: '2026-11-20', seconds: 0 },
    60,
  )
  expect(result.map((v) => [v.stop.id, v.date, v.state])).toEqual([
    ['1', '2026-11-19', 'past'],
    ['2', '2026-11-20', 'next'],
  ])
  expect(visibleConnections(result)).toHaveLength(0)
})
it('hides unknown/recycling-only stops and does not bridge hidden stops', () => {
  const data = {
    ...dataset,
    routes: [
      {
        ...route,
        stops: [
          stop('1', '18:00'),
          stop('2', '18:05', { lat: 25 }),
          stop('3', '18:10'),
          stop('4', null),
          stop('5', '18:00', { collectionDays: [2], recyclingDays: [4] }),
        ],
      },
    ],
  }
  const result = nearbyVisits(
    data,
    center,
    1000,
    { date: '2026-11-19', seconds: 18 * 3600 },
    60,
  )
  expect(result.map((v) => v.stop.id)).toEqual(['1', '3'])
  expect(visibleConnections(result)).toEqual([])
})
it('marks the next visible time per route, including simultaneous stops', () => {
  const data = {
    ...dataset,
    routes: [
      {
        ...route,
        stops: [stop('1', '18:00'), stop('2', '18:00'), stop('3', '18:10')],
      },
    ],
  }
  expect(
    nearbyVisits(
      data,
      center,
      1000,
      { date: '2026-11-19', seconds: 17 * 3600 + 59 * 60 },
      60,
    ).map((v) => v.state),
  ).toEqual(['next', 'next', 'future'])
  expect(distanceMeters(center, center)).toBe(0)
  expect(distanceMeters(center, { lat: 23.11, lng: 120.3 })).toBeGreaterThan(
    1000,
  )
})
