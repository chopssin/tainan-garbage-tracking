import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { normalize, renderReport } from './import-tainan-data.mjs'

const raw = await readFile('data/official-snapshot.json')
const data = JSON.parse(
  await readFile('public/data/tainan-routes.json', 'utf8'),
)
const report = JSON.parse(await readFile('data/coverage-report.json', 'utf8'))
const { normalized, report: rebuiltReport } = normalize(JSON.parse(raw), {
  retrievedAt: data.metadata.retrievedAt,
  rawSha256: createHash('sha256').update(raw).digest('hex'),
  responseBytes: raw.length,
  htmlRecordCount: report.completeness.htmlRecordCount,
})
assert.deepEqual(
  data,
  normalized,
  'App data must reproduce from the retained official snapshot',
)
assert.deepEqual(
  report,
  rebuiltReport,
  'Coverage report must match the snapshot',
)
assert.equal(
  await readFile('data/COVERAGE.md', 'utf8'),
  renderReport(report),
  'Written coverage must match the report',
)
const stops = data.routes.flatMap((route) => route.stops)
assert.equal(
  new Set(data.routes.map((route) => route.id)).size,
  data.routes.length,
  'Route IDs must be unique',
)
assert.equal(
  new Set(stops.map((stop) => stop.id)).size,
  stops.length,
  'Stop IDs must be unique',
)
assert.deepEqual(
  stops.map((stop) => stop.sourceRecordIndex).sort((a, b) => a - b),
  Array.from({ length: JSON.parse(raw).data.length }, (_, i) => i + 1),
  'Every source record must be retained exactly once',
)
console.log(
  `Verified ${stops.length} records, ${data.routes.length} routes, ${data.metadata.districtCount}/${data.metadata.expectedDistrictCount} districts; source hash, reports and IDs match.`,
)
