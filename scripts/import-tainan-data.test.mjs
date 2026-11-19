// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { normalize, parseDays } from './import-tainan-data.mjs'
const record = {
  AREA: '山上區',
  ROUTEID: '18',
  ROUTEORDER: 1,
  POINTNAME: '公所',
  VILLAGE: '山上里',
  TIME: '18:00',
  LATITUDE: 23.1,
  LONGITUDE: 120.3,
  WORKDAY: '一、三、五',
  RECYCLEDAY: '二、四',
}
const payload = (...data) => ({ success: true, errorCode: 0, data })

describe('official data ingestion', () => {
  it('distinguishes no service from missing or unsupported day text', () => {
    expect(parseDays('一、二、日')).toEqual([0, 1, 2])
    expect(parseDays('無清運')).toEqual([])
    expect(parseDays('')).toBeNull()
    expect(parseDays('週一至週五')).toBeNull()
  })
  it('rejects errors, empty, paginated, and independently mismatched data', () => {
    expect(() =>
      normalize({ success: false, errorCode: 1, data: [record] }),
    ).toThrow()
    expect(() => normalize(payload())).toThrow()
    expect(() => normalize({ ...payload(record), nextPage: 2 })).toThrow(
      /pagination/,
    )
    expect(() => normalize(payload(record), { htmlRecordCount: 2 })).toThrow(
      /counts differ/,
    )
  })
  it('retains invalid values as unknown and counts every source row', () => {
    const { normalized, report } = normalize(
      payload(record, {
        ...record,
        ROUTEORDER: 2,
        TIME: '25:80',
        LATITUDE: '',
        WORKDAY: '未知',
      }),
    )
    expect(normalized.routes[0].stops).toHaveLength(2)
    expect(normalized.routes[0].stops[1]).toMatchObject({
      time: null,
      lat: null,
      lng: null,
      collectionDays: null,
      sourceRecordIndex: 2,
    })
    expect(report.completeness.droppedRecords).toBe(0)
    expect(normalized.routes[0].stops[0].recyclingDays).toEqual([2, 4])
    expect(
      normalized.metadata.issues['recycling-days-outside-collection-days'],
    ).toBe(1)
  })
  it('does not merge equal route IDs from different districts or silently discard duplicates', () => {
    const { normalized, report } = normalize(
      payload(record, record, { ...record, AREA: '新市區' }),
    )
    expect(normalized.routes).toHaveLength(2)
    expect(normalized.metadata.stopCount).toBe(3)
    expect(normalized.metadata.exactDuplicateRecords).toBe(1)
    expect(
      new Set(normalized.routes.flatMap((r) => r.stops.map((s) => s.id))).size,
    ).toBe(3)
    expect(report.duplicateOrders).toHaveLength(1)
  })
  it('sorts by official stop order and flags backward times without rewriting them', () => {
    const { normalized, report } = normalize(
      payload(
        { ...record, ROUTEORDER: 2, TIME: '04:59' },
        { ...record, TIME: '19:57' },
      ),
    )
    expect(normalized.routes[0].stops.map((s) => s.time)).toEqual([
      '19:57',
      '04:59',
    ])
    expect(report.backwardsTimeTransitions).toHaveLength(1)
  })
})
