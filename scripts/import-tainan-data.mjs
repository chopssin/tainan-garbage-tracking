#!/usr/bin/env node
/** Node 24, no dependencies. Fetch the official complete resource or normalize a saved snapshot. */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'

export const SOURCE = {
  title: '臺南市垃圾清運點資料',
  publisher: '臺南市政府環境保護局',
  catalogUrl:
    'https://data.tainan.gov.tw/DataSet/Detail/57aaa860-bb03-43c2-a797-73971d6cc73d',
  resourceUrl:
    'https://data.tainan.gov.tw/Resource/84df8cd6-8741-41ed-919c-5105a28ecd6d',
  apiUrl:
    'https://soa.tainan.gov.tw/Api/Service/Get/84df8cd6-8741-41ed-919c-5105a28ecd6d',
  license: '政府資料開放授權條款－第1版',
  licenseUrl: 'https://data.gov.tw/license',
  updateFrequency: '不定期更新',
  districtReferenceUrl: 'https://www.tainan.gov.tw/cp.aspx?n=13293',
  // Catalog observations, NOT per-record freshness. Recheck these when refreshing the source.
  catalogMetadataUpdatedAt: '2026-01-28T16:41:37+08:00',
  resourceUpdatedAt: '2026-01-02',
  catalogObservedAt: '2026-11-19',
}
export const EXPECTED_DISTRICTS = [
  '新營區',
  '鹽水區',
  '白河區',
  '柳營區',
  '後壁區',
  '東山區',
  '麻豆區',
  '下營區',
  '六甲區',
  '官田區',
  '大內區',
  '佳里區',
  '學甲區',
  '西港區',
  '七股區',
  '將軍區',
  '北門區',
  '新化區',
  '善化區',
  '新市區',
  '安定區',
  '山上區',
  '玉井區',
  '楠西區',
  '南化區',
  '左鎮區',
  '仁德區',
  '歸仁區',
  '關廟區',
  '龍崎區',
  '永康區',
  '東區',
  '南區',
  '北區',
  '安南區',
  '安平區',
  '中西區',
]
const FIELDS = [
  'AREA',
  'ROUTEID',
  'ROUTEORDER',
  'VILLAGE',
  'POINTNAME',
  'TIME',
  'LONGITUDE',
  'LATITUDE',
  'WORKDAY',
  'RECYCLEDAY',
]
const DAY_NUMBERS = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }
const text = (value) => (value == null ? '' : String(value).trim())
const hash = (value) => createHash('sha256').update(value).digest('hex')
const canonical = (record) =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, record[key]]),
    ),
  )

export function parseDays(value) {
  const raw = text(value)
  if (raw === '無清運') return []
  if (!raw) return null
  const tokens = raw.split(/[、,，]/u).map((item) => item.trim())
  if (tokens.some((item) => !Object.hasOwn(DAY_NUMBERS, item))) return null
  return [...new Set(tokens.map((item) => DAY_NUMBERS[item]))].sort(
    (a, b) => a - b,
  )
}

function number(value) {
  if (value === null || value === undefined || text(value) === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalize(
  payload,
  { retrievedAt, rawSha256, responseBytes = null, htmlRecordCount = null } = {},
) {
  if (
    payload.success !== true ||
    payload.errorCode !== 0 ||
    !Array.isArray(payload.data) ||
    payload.data.length === 0
  ) {
    throw new Error(
      'Expected a successful, non-empty official JSON envelope with data[]. Refusing to replace data.',
    )
  }
  // A new pagination contract must be reviewed instead of silently importing only its first page.
  for (const key of [
    'next',
    'nextPage',
    'nextLink',
    'continuationToken',
    'hasMore',
    'page',
    'pageSize',
    'total',
    'totalCount',
  ]) {
    if (Object.hasOwn(payload, key) && payload[key] != null)
      throw new Error(
        `Unexpected pagination field ${key}; review completeness before importing.`,
      )
  }
  if (htmlRecordCount !== null && htmlRecordCount !== payload.data.length)
    throw new Error('Official resource table and API record counts differ.')
  const routeMap = new Map()
  const duplicateMap = new Map()
  const sourceIds = new Map()
  const issueCounts = {}
  const fieldPresence = Object.fromEntries(FIELDS.map((field) => [field, 0]))
  const unknownFields = new Set()
  const exactDuplicateGroups = []
  let exactDuplicateRecords = 0
  for (const [index, record] of payload.data.entries()) {
    if (!record || typeof record !== 'object' || Array.isArray(record))
      throw new Error(`Source record ${index + 1} is not an object.`)
    for (const key of Object.keys(record))
      if (!FIELDS.includes(key) && key !== 'WORDDAY') unknownFields.add(key)
    for (const field of FIELDS)
      if (Object.hasOwn(record, field)) fieldPresence[field]++
    const fingerprint = canonical(record)
    const previousIndices = duplicateMap.get(fingerprint) ?? []
    if (previousIndices.length) exactDuplicateRecords++
    previousIndices.push(index + 1)
    duplicateMap.set(fingerprint, previousIndices)
    const district = text(record.AREA)
    const sourceRouteId = text(record.ROUTEID)
    const routeId = `${district}:${sourceRouteId}`
    const issues = []
    if (!district) issues.push('missing-district')
    if (!sourceRouteId) issues.push('missing-route-id')
    if (!text(record.POINTNAME)) issues.push('missing-name')
    if (!text(record.VILLAGE)) issues.push('missing-village')
    const parsedOrder = number(record.ROUTEORDER)
    const order =
      Number.isInteger(parsedOrder) && parsedOrder > 0 ? parsedOrder : null
    if (order === null) issues.push('invalid-order')
    const rawTime = text(record.TIME)
    const time = /^([01]\d|2[0-3]):[0-5]\d$/u.test(rawTime) ? rawTime : null
    if (time === null) issues.push('invalid-time')
    const rawLat = number(record.LATITUDE),
      rawLng = number(record.LONGITUDE)
    const validCoordinates =
      rawLat !== null &&
      rawLng !== null &&
      rawLat >= -90 &&
      rawLat <= 90 &&
      rawLng >= -180 &&
      rawLng <= 180
    const lat = validCoordinates ? rawLat : null,
      lng = validCoordinates ? rawLng : null
    if (!validCoordinates) issues.push('invalid-coordinates')
    // Plausibility check only; this rectangle does not establish administrative boundaries.
    else if (!(lat >= 22.8 && lat <= 23.5 && lng >= 120 && lng <= 120.8))
      issues.push('coordinates-outside-tainan-envelope')
    const rawDays = text(record.WORKDAY ?? record.WORDDAY)
    const rawRecyclingDays = text(record.RECYCLEDAY)
    const collectionDays = parseDays(rawDays),
      recyclingDays = parseDays(rawRecyclingDays)
    if (collectionDays === null) issues.push('unknown-collection-days')
    if (recyclingDays === null) issues.push('unknown-recycling-days')
    if (
      collectionDays &&
      recyclingDays?.some((day) => !collectionDays.includes(day))
    )
      issues.push('recycling-days-outside-collection-days')
    if (previousIndices.length > 1) issues.push('exact-duplicate-record')
    const stop = {
      id: `${routeId}:${order ?? 'unknown'}:${hash(fingerprint).slice(0, 10)}:${previousIndices.length}`,
      sourceRecordIndex: index + 1,
      order,
      name: text(record.POINTNAME),
      village: text(record.VILLAGE),
      time,
      rawTime,
      lat,
      lng,
      collectionDays,
      recyclingDays,
      rawDays,
      rawRecyclingDays,
      issues,
    }
    if (order === null) stop.rawOrder = record.ROUTEORDER ?? null
    if (!validCoordinates)
      stop.rawCoordinates = {
        lat: record.LATITUDE ?? null,
        lng: record.LONGITUDE ?? null,
      }
    if (!routeMap.has(routeId))
      routeMap.set(routeId, {
        id: routeId,
        sourceRouteId,
        district,
        name: `${district || '未標示行政區'} · 路線 ${sourceRouteId || '未標示'}`,
        issues: [],
        stops: [],
      })
    routeMap.get(routeId).stops.push(stop)
    if (!sourceIds.has(sourceRouteId)) sourceIds.set(sourceRouteId, new Set())
    sourceIds.get(sourceRouteId).add(district)
  }
  for (const indices of duplicateMap.values())
    if (indices.length > 1) exactDuplicateGroups.push(indices)
  const routes = [...routeMap.values()].sort(
    (a, b) =>
      a.district.localeCompare(b.district, 'zh-Hant') ||
      a.sourceRouteId.localeCompare(b.sourceRouteId, undefined, {
        numeric: true,
      }),
  )
  const backwardsTimeTransitions = [],
    duplicateOrders = [],
    orderGaps = [],
    sameTimeTransitions = []
  for (const route of routes) {
    route.stops.sort(
      (a, b) =>
        (a.order ?? Infinity) - (b.order ?? Infinity) ||
        a.sourceRecordIndex - b.sourceRecordIndex,
    )
    const orders = new Map()
    for (const [index, stop] of route.stops.entries()) {
      if (stop.order !== null) {
        if (orders.has(stop.order)) {
          stop.issues.push('duplicate-route-order')
          duplicateOrders.push({
            routeId: route.id,
            order: stop.order,
            stopIds: [orders.get(stop.order), stop.id],
          })
        }
        orders.set(stop.order, stop.id)
      }
      const previous = route.stops[index - 1]
      if (
        (!previous && stop.order !== 1) ||
        (previous?.order !== null &&
          stop.order !== null &&
          previous &&
          stop.order > previous.order + 1)
      ) {
        orderGaps.push({
          routeId: route.id,
          previousOrder: previous?.order ?? null,
          order: stop.order,
        })
        stop.issues.push('route-order-gap')
      }
      if (previous?.time && stop.time) {
        const detail = {
          routeId: route.id,
          previousOrder: previous.order,
          order: stop.order,
          previousTime: previous.time,
          time: stop.time,
        }
        if (stop.time < previous.time) {
          backwardsTimeTransitions.push(detail)
          stop.issues.push('time-before-previous-stop')
        } else if (stop.time === previous.time) sameTimeTransitions.push(detail)
      }
      for (const issue of stop.issues)
        issueCounts[issue] = (issueCounts[issue] ?? 0) + 1
    }
    route.issues = [...new Set(route.stops.flatMap((stop) => stop.issues))]
  }
  const allStops = routes.flatMap((route) => route.stops)
  const districts = [...new Set(routes.map((route) => route.district))].sort(
    (a, b) => a.localeCompare(b, 'zh-Hant'),
  )
  const districtCoverage = districts.map((district) => ({
    district,
    routes: routes.filter((route) => route.district === district).length,
    stops: routes
      .filter((route) => route.district === district)
      .reduce((count, route) => count + route.stops.length, 0),
  }))
  const missingDistricts = EXPECTED_DISTRICTS.filter(
    (district) => !districts.includes(district),
  )
  const missingInformation = [
    'No per-record update timestamp, operating date range, holiday/suspension exceptions, or real-time vehicle position is supplied.',
    'No route names, road geometry, travel duration, departure/dwell times, or cross-midnight service-day indicator is supplied.',
    'Collection and recycling days are independent source fields; recycling days must not be intersected with garbage collection days.',
    'Published coordinates are retained as supplied; the resource does not declare its coordinate reference system.',
    'A successful complete API response establishes dataset coverage, not completeness of every real-world Tainan service.',
  ]
  const metadata = {
    schemaVersion: 1,
    ...SOURCE,
    retrievedAt,
    rawSha256,
    timezone: 'Asia/Taipei',
    dayNumberConvention: 'JavaScript Sunday=0 through Saturday=6',
    dataKind: 'published-timetable-not-live-gps',
    routeCount: routes.length,
    stopCount: allStops.length,
    districtCount: districts.length,
    expectedDistrictCount: EXPECTED_DISTRICTS.length,
    districts,
    missingDistricts,
    exactDuplicateRecords,
    issues: issueCounts,
    missingInformation,
  }
  const report = {
    metadata,
    completeness: {
      sourceRecordCount: payload.data.length,
      normalizedRecordCount: allStops.length,
      droppedRecords: 0,
      apiSuccess: payload.success,
      apiErrorCode: payload.errorCode,
      responseBytes,
      apiSizeField: payload.size,
      htmlRecordCount,
      paginationFieldsPresent: false,
      notes:
        'Endpoint returned one complete JSON envelope without pagination fields. Its size field is not a record count or HTTP transfer size.',
    },
    fieldPresence,
    unknownFields: [...unknownFields],
    districtCoverage,
    exactDuplicateGroups,
    uniqueCoordinates: new Set(
      allStops.map((stop) => `${stop.lat},${stop.lng}`),
    ).size,
    sourceRouteIdsAcrossDistricts: [...sourceIds]
      .filter(([, areas]) => areas.size > 1)
      .map(([id, areas]) => ({ id, districts: [...areas] })),
    backwardsTimeTransitions,
    duplicateOrders,
    orderGaps,
    sameTimeTransitions,
    routesWithTimeReversals: new Set(
      backwardsTimeTransitions.map((item) => item.routeId),
    ).size,
    recordsWithIssues: allStops.filter((stop) => stop.issues.length > 0).length,
    recordsWithNoRecycling: allStops.filter(
      (stop) => stop.recyclingDays?.length === 0,
    ).length,
  }
  return { normalized: { metadata, routes }, report }
}

export function renderReport(report) {
  const m = report.metadata
  return `# Tainan collection timetable coverage\n\nRetrieved: ${m.retrievedAt}. Data provider: ${m.publisher}.\n\n[Official catalog](${m.catalogUrl}) · [Resource](${m.resourceUrl}) · [JSON API](${m.apiUrl}) · [License](${m.licenseUrl})\n\n## Coverage\n\n- ${m.stopCount.toLocaleString('en')} route-stop schedule records across ${m.routeCount} routes and ${m.districtCount}/${m.expectedDistrictCount} administrative districts. These are scheduled route visits, not a count of unique physical locations.\n- Missing district: ${m.missingDistricts.join('、') || 'none'}. Missing from this dataset does not mean no service. [Official district list](${m.districtReferenceUrl}).\n- ${report.completeness.droppedRecords} records dropped; ${m.exactDuplicateRecords} exact duplicate records; ${report.duplicateOrders.length} duplicate route orders; ${report.orderGaps.length} order gaps.\n- ${report.uniqueCoordinates.toLocaleString('en')} distinct coordinate pairs (not a guaranteed count of unique collection sites).\n- Route IDs use district plus source ROUTEID. Every stop retains its source record number.\n\n## Validation\n\n| Check | Records / transitions |\n| --- | ---: |\n| Invalid/missing coordinates | ${m.issues['invalid-coordinates'] ?? 0} |\n| Outside broad Tainan coordinate envelope | ${m.issues['coordinates-outside-tainan-envelope'] ?? 0} |\n| Invalid/missing HH:mm | ${m.issues['invalid-time'] ?? 0} |\n| Invalid/missing route order | ${m.issues['invalid-order'] ?? 0} |\n| Unknown collection days | ${m.issues['unknown-collection-days'] ?? 0} |\n| Unknown recycling days | ${m.issues['unknown-recycling-days'] ?? 0} |\n| Backwards time transitions | ${report.backwardsTimeTransitions.length} across ${report.routesWithTimeReversals} routes |\n| Adjacent equal scheduled times | ${report.sameTimeTransitions.length} |\n| Recycling days outside garbage collection days | ${m.issues['recycling-days-outside-collection-days'] ?? 0} |\n| Explicit 無清運 recycling values | ${report.recordsWithNoRecycling} |\n\nAll raw values are preserved in the source snapshot. Backwards times are flagged, not corrected or assumed to cross midnight. Recycling is an independent schedule; 無清運 is an empty day list, and unrecognized/missing text is null. Source field WORKDAY is used; the catalog description misspells it WORDDAY. Missing or invalid values stay unknown.\n\n## Time reversals to review\n\n| District:route | Previous order → order | Previous time → time |\n| --- | --- | --- |\n${report.backwardsTimeTransitions.map((item) => `| ${item.routeId} | ${item.previousOrder} → ${item.order} | ${item.previousTime} → ${item.time} |`).join('\n')}\n\n## Freshness and completeness limits\n\nCatalog metadata observed ${m.catalogObservedAt}: updated ${m.catalogMetadataUpdatedAt}; resource update date ${m.resourceUpdatedAt}; update frequency ${m.updateFrequency}. These dates describe the catalog, not verified freshness of each stop. Retrieval time is not a schedule revision date.\n\nThe endpoint returned HTTP JSON with success=true and errorCode=0, ${report.completeness.sourceRecordCount} records, no pagination metadata, and a complete parseable payload (${report.completeness.responseBytes ?? 'unknown'} bytes). ${report.completeness.htmlRecordCount === null ? 'No independent HTML row-count comparison was supplied for this import.' : `The official resource HTML table independently contained ${report.completeness.htmlRecordCount} data rows, matching the API.`} The API size=${report.completeness.apiSizeField} field is not interpreted as a byte or record total. All normalized records are retained.\n\n${m.missingInformation.map((item) => `- ${item}`).join('\n')}\n\nThe app must say **班表估算／非即時 GPS**. A passed scheduled time does not establish that a truck has passed, arrived, or departed. Route connections join ordered points and are not road geometry. Holidays and temporary changes require checking the official service.\n\n## District coverage\n\n| District | Routes | Route-stop records |\n| --- | ---: | ---: |\n${report.districtCoverage.map((item) => `| ${item.district} | ${item.routes} | ${item.stops} |`).join('\n')}\n\n## Reproduction\n\nOffline, using the retained snapshot:\n\n\`\`\`sh\nnode scripts/import-tainan-data.mjs --input data/official-snapshot.json --retrieved-at ${m.retrievedAt}\n\`\`\`\n\nRefresh from the official API (requires network):\n\n\`\`\`sh\nnode scripts/import-tainan-data.mjs\n\`\`\`\n\nDefault files: data/official-snapshot.json, public/data/tainan-routes.json, data/coverage-report.json, data/COVERAGE.md. --input performs no download; --output, --raw, --report, --report-md override paths. --resource-html accepts a downloaded official resource page for independent table-count validation. Recheck catalog metadata dates when refreshing.\n\nSource SHA-256: \`${m.rawSha256}\`. License: ${m.license}.\n`
}

async function main() {
  const args = process.argv.slice(2),
    options = {}
  const allowed = new Set([
    'input',
    'output',
    'raw',
    'report',
    'report-md',
    'retrieved-at',
    'resource-html',
  ])
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/u, '')
    if (
      !args[i]?.startsWith('--') ||
      !allowed.has(key) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw new Error(`Invalid argument ${args[i]}`)
    options[key] = args[i + 1]
  }
  let bytes, retrievedAt
  if (options.input) {
    bytes = await readFile(options.input)
    retrievedAt =
      options['retrieved-at'] ?? (await stat(options.input)).mtime.toISOString()
  } else {
    const response = await fetch(SOURCE.apiUrl, {
      signal: AbortSignal.timeout(60000),
      headers: { accept: 'application/json' },
    })
    if (!response.ok)
      throw new Error(`Official API returned HTTP ${response.status}`)
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new Error('Official API did not return JSON')
    bytes = Buffer.from(await response.arrayBuffer())
    retrievedAt = new Date().toISOString()
  }
  if (!Number.isFinite(Date.parse(retrievedAt)))
    throw new Error('Invalid retrieved-at timestamp')
  let htmlRecordCount = null
  if (options['resource-html']) {
    const html = await readFile(options['resource-html'], 'utf8')
    if (!html.trim().endsWith('</html>'))
      throw new Error('Resource HTML is incomplete')
    htmlRecordCount = [
      ...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu),
    ].filter((match) => (match[1].match(/<td\b/giu) ?? []).length === 10).length
  }
  const { normalized, report } = normalize(JSON.parse(bytes.toString('utf8')), {
    retrievedAt,
    rawSha256: hash(bytes),
    responseBytes: bytes.length,
    htmlRecordCount,
  })
  const files = [
    [
      options.output ?? 'public/data/tainan-routes.json',
      JSON.stringify(normalized),
    ],
    [
      options.report ?? 'data/coverage-report.json',
      JSON.stringify(report, null, 2) + '\n',
    ],
    [options['report-md'] ?? 'data/COVERAGE.md', renderReport(report)],
  ]
  if (!options.input)
    files.push([options.raw ?? 'data/official-snapshot.json', bytes])
  // Validate everything before writing any output; a failed refresh leaves the previous files intact.
  for (const [path, content] of files) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
  }
  console.log(
    JSON.stringify({
      records: normalized.metadata.stopCount,
      routes: normalized.metadata.routeCount,
      districts: normalized.metadata.districtCount,
      missingDistricts: normalized.metadata.missingDistricts,
      issues: normalized.metadata.issues,
    }),
  )
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)
) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
