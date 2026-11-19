import { describe, expect, it } from 'vitest'
import {
  countdown,
  formatTime,
  getSchedule,
  taipeiNow,
  validDate,
  weekday,
} from './schedule'
import { route, stop } from './test/fixtures'
const clock = (seconds: number, date = '2026-11-19') => ({ date, seconds })

describe('Taiwan calendar and timetable semantics', () => {
  it('uses Taiwan time across UTC midnight boundaries and validates real dates', () => {
    expect(taipeiNow(new Date('2026-11-18T16:00:01Z'))).toEqual(clock(1))
    expect(weekday('2026-11-19')).toBe(4)
    expect(validDate('2024-02-29')).toBe(true)
    expect(validDate('2026-02-29')).toBe(false)
    expect(validDate('2026-13-01')).toBe(false)
    expect(validDate('')).toBe(false)
  })
  it('moves through upcoming, current scheduled minute, and passed states', () => {
    expect(getSchedule(route, clock(17 * 3600)).states).toEqual([
      'next',
      'future',
      'future',
    ])
    expect(getSchedule(route, clock(18 * 3600 + 59)).now).toBe(true)
    expect(getSchedule(route, clock(18 * 3600 + 60)).states).toEqual([
      'past',
      'next',
      'future',
    ])
    const ended = getSchedule(route, clock(19 * 3600))
    expect(ended.states).toEqual(['past', 'past', 'past'])
    expect(ended.next).toBeNull()
  })
  it('does not turn a recycling-only day into a garbage pickup', () => {
    const result = getSchedule(
      {
        ...route,
        stops: [
          stop('1', '18:00', { collectionDays: [1], recyclingDays: [4] }),
        ],
      },
      clock(17 * 3600),
    )
    expect(result.states).toEqual(['inactive'])
    expect(result.stops[0]?.recycling).toBe(true)
    expect(result.next).toBeNull()
    expect(getSchedule(route, clock(18 * 3600, '2026-11-22')).activeCount).toBe(
      0,
    )
  })
  it('preserves order while choosing the earliest next time; never assumes midnight rollover', () => {
    const inconsistent = {
      ...route,
      stops: [stop('1', '19:57'), stop('2', '04:59'), stop('3', '20:00')],
    }
    const result = getSchedule(inconsistent, clock(19 * 3600 + 58 * 60))
    expect(result.stops.map((s) => s.id)).toEqual(['1', '2', '3'])
    expect(result.states).toEqual(['past', 'past', 'next'])
    expect(result.next?.id).toBe('3')
  })
  it('marks simultaneous scheduled stops without claiming an exact vehicle location', () => {
    const result = getSchedule(
      {
        ...route,
        stops: [stop('1', '18:00'), stop('2', '18:00'), stop('3', '18:02')],
      },
      clock(17 * 3600),
    )
    expect(result.simultaneous).toBe(2)
    expect(result.states).toEqual(['next', 'next', 'future'])
  })
  it('keeps unknown dates and times out of countdown selection', () => {
    const result = getSchedule(
      {
        ...route,
        stops: [
          stop('1', null),
          stop('2', '18:00', { collectionDays: null }),
          stop('3', '25:00'),
        ],
      },
      clock(17 * 3600),
    )
    expect(result.states).toEqual(['unknown', 'unknown', 'unknown'])
    expect(result.next).toBeNull()
    expect(result.unknownCount).toBe(3)
  })
  it('formats hours, seconds, and end-of-day without wrapping to an invented next day', () => {
    expect(countdown(3661)).toBe('1:01:01')
    expect(countdown(-5)).toBe('00:00')
    expect(formatTime(86399, true)).toBe('23:59:59')
  })
})
