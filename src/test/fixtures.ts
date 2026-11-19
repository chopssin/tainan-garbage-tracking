import type { Dataset, Route, Stop } from '../types'

export function stop(
  id: string,
  time: string | null,
  overrides: Partial<Stop> = {},
): Stop {
  return {
    id,
    time,
    order: Number(id) || 1,
    sourceRecordIndex: 1,
    name: `測試站 ${id}`,
    village: '測試里',
    lat: 23.1,
    lng: 120.3,
    collectionDays: [1, 2, 4, 5, 6],
    recyclingDays: [2, 6],
    rawDays: '一、二、四、五、六',
    rawRecyclingDays: '二、六',
    issues: [],
    ...overrides,
  }
}
export const route: Route = {
  id: '山上區:18',
  sourceRouteId: '18',
  district: '山上區',
  name: '山上區 · 路線 18',
  issues: [],
  stops: [stop('1', '18:00'), stop('2', '18:05'), stop('3', '18:10')],
}
export const dataset: Dataset = {
  metadata: {
    schemaVersion: 1,
    retrievedAt: '2026-11-19T00:00:00Z',
    resourceUpdatedAt: '2026-01-02',
    routeCount: 2,
    stopCount: 4,
    districtCount: 2,
    expectedDistrictCount: 37,
    districts: ['山上區', '新市區'],
    missingDistricts: ['龍崎區'],
    issues: {},
    catalogUrl: 'https://data.tainan.gov.tw',
    licenseUrl: 'https://data.gov.tw/license',
  },
  routes: [
    route,
    {
      ...route,
      id: '新市區:266',
      district: '新市區',
      sourceRouteId: '266',
      name: '新市區 · 路線 266',
      stops: [stop('4', '19:00')],
    },
  ],
}
