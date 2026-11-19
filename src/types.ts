export interface Stop {
  id: string
  order: number | null
  sourceRecordIndex: number
  name: string
  village: string
  time: string | null
  lat: number | null
  lng: number | null
  collectionDays: number[] | null
  recyclingDays: number[] | null
  rawDays: string
  rawRecyclingDays: string
  issues: string[]
}
export interface Route {
  id: string
  sourceRouteId: string
  district: string
  name: string
  issues: string[]
  stops: Stop[]
}
export interface Dataset {
  metadata: {
    schemaVersion: number
    retrievedAt: string
    resourceUpdatedAt: string
    routeCount: number
    stopCount: number
    districtCount: number
    expectedDistrictCount: number
    districts: string[]
    missingDistricts: string[]
    issues: Record<string, number>
    catalogUrl: string
    licenseUrl: string
  }
  routes: Route[]
}
export interface Clock {
  date: string
  seconds: number
}
export type StopStatus = 'past' | 'next' | 'future' | 'inactive' | 'unknown'
