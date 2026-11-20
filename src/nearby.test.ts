import { expect, it } from 'vitest'
import {
  nearbyVisits,
  mapVisits,
  visibleConnections,
  distanceMeters,
} from './nearby'
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
    { date: '2026-11-19', seconds: 23 * 3600 + 30 * 60 },
    60,
  )
  expect(result.map((v) => [v.stop.id, v.date, v.state])).toEqual([
    ['1', '2026-11-19', 'next'],
    ['2', '2026-11-20', 'future'],
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

it('uses a forward-only window and adds only immediate neighbors until expanded', () => {
  const clock = { date: '2026-11-19', seconds: 18 * 3600 }
  const data = {
    ...dataset,
    routes: [
      {
        ...route,
        stops: [
          stop('1', '17:40'),
          stop('2', '17:50'),
          stop('3', '18:00'),
          stop('4', '18:40', { lat: 24 }),
          stop('5', '19:00'),
          stop('6', null, { lat: null }),
        ],
      },
    ],
  }
  const matches = nearbyVisits(data, center, 500, clock, 30)
  expect(matches.map((v) => v.stop.id)).toEqual(['3'])
  const visible = mapVisits(matches, center, clock, null)
  expect(visible.map((v) => v.stop.id).sort()).toEqual(['2', '3', '4'])
  expect(visible.filter((v) => v.context)).toHaveLength(2)
  expect(visibleConnections(visible)).toHaveLength(2)
  const full = mapVisits(matches, center, clock, route.id)
  expect(full.map((v) => v.stop.id).sort()).toEqual(['1', '2', '3', '4', '5'])
  expect(mapVisits([], center, clock, route.id)).toEqual([])
})

it('shows one anchor and its immediate neighbors per unselected route, even with many matching stops', () => {
  const clock = { date: '2026-11-19', seconds: 18 * 3600 }
  const stops = [
    stop('1', '17:50'),
    stop('2', '18:00'),
    stop('3', '18:00'),
    stop('4', '18:10'),
    stop('5', '18:20'),
  ]
  const data = {
    ...dataset,
    routes: [
      { ...route, stops },
      {
        ...route,
        id: 'other',
        stops: stops.map((s) => ({ ...s, id: 'other-' + s.id })),
      },
    ],
  }
  const matches = nearbyVisits(data, center, 500, clock, 30)
  expect(matches).toHaveLength(8)
  const compact = mapVisits(matches, center, clock, null)
  expect(compact).toHaveLength(6)
  expect(compact.filter((v) => v.state === 'next')).toHaveLength(2)
  expect(
    compact
      .filter((v) => v.route.id === route.id)
      .map((v) => [v.index, v.state]),
  ).toEqual([
    [0, 'past'],
    [1, 'next'],
    [2, 'future'],
  ])
  const expanded = mapVisits(matches, center, clock, route.id)
  expect(expanded.filter((v) => v.route.id === route.id)).toHaveLength(5)
  expect(expanded.filter((v) => v.route.id === 'other')).toHaveLength(3)
  expect(mapVisits(matches, center, clock, null)).toEqual(compact)
})

it('does not wrap endpoints or skip missing-coordinate neighbors', () => {
  const clock = { date: '2026-11-19', seconds: 18 * 3600 }
  const data = {
    ...dataset,
    routes: [
      {
        ...route,
        stops: [
          stop('1', '18:00'),
          stop('2', '18:05', { lat: null }),
          stop('3', '18:10'),
        ],
      },
    ],
  }
  const matches = nearbyVisits(data, center, 500, clock, 30)
  expect(mapVisits(matches, center, clock, null).map((v) => v.stop.id)).toEqual(
    ['1'],
  )
  const last = nearbyVisits(
    data,
    center,
    500,
    { ...clock, seconds: 18 * 3600 + 10 * 60 },
    30,
  )
  expect(mapVisits(last, center, clock, null).map((v) => v.stop.id)).toEqual([
    '3',
  ])
})
