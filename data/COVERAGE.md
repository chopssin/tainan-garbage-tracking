# Tainan collection timetable coverage

Retrieved: 2026-11-19T05:42:02.314Z. Data provider: 臺南市政府環境保護局.

[Official catalog](https://data.tainan.gov.tw/DataSet/Detail/57aaa860-bb03-43c2-a797-73971d6cc73d) · [Resource](https://data.tainan.gov.tw/Resource/84df8cd6-8741-41ed-919c-5105a28ecd6d) · [JSON API](https://soa.tainan.gov.tw/Api/Service/Get/84df8cd6-8741-41ed-919c-5105a28ecd6d) · [License](https://data.gov.tw/license)

## Coverage

- 14,190 route-stop schedule records across 370 routes and 36/37 administrative districts. These are scheduled route visits, not a count of unique physical locations.
- Missing district: 龍崎區. Missing from this dataset does not mean no service. [Official district list](https://www.tainan.gov.tw/cp.aspx?n=13293).
- 0 records dropped; 0 exact duplicate records; 0 duplicate route orders; 0 order gaps.
- 13,218 distinct coordinate pairs (not a guaranteed count of unique collection sites).
- Route IDs use district plus source ROUTEID. Every stop retains its source record number.

## Validation

| Check | Records / transitions |
| --- | ---: |
| Invalid/missing coordinates | 0 |
| Outside broad Tainan coordinate envelope | 0 |
| Invalid/missing HH:mm | 0 |
| Invalid/missing route order | 0 |
| Unknown collection days | 0 |
| Unknown recycling days | 0 |
| Backwards time transitions | 11 across 10 routes |
| Adjacent equal scheduled times | 22 |
| Recycling days outside garbage collection days | 465 |
| Explicit 無清運 recycling values | 1034 |

All raw values are preserved in the source snapshot. Backwards times are flagged, not corrected or assumed to cross midnight. Recycling is an independent schedule; 無清運 is an empty day list, and unrecognized/missing text is null. Source field WORKDAY is used; the catalog description misspells it WORDDAY. Missing or invalid values stay unknown.

## Time reversals to review

| District:route | Previous order → order | Previous time → time |
| --- | --- | --- |
| 仁德區:319 | 44 → 45 | 19:31 → 18:34 |
| 六甲區:22 | 36 → 37 | 18:59 → 18:50 |
| 永康區:47 | 48 → 49 | 12:12 → 10:15 |
| 永康區:417 | 95 → 96 | 19:57 → 04:59 |
| 安平區:330 | 36 → 37 | 15:47 → 15:42 |
| 安平區:332 | 90 → 91 | 18:52 → 15:54 |
| 安定區:111 | 24 → 25 | 14:21 → 14:18 |
| 安定區:111 | 29 → 30 | 15:31 → 14:32 |
| 西港區:139 | 52 → 53 | 19:32 → 19:29 |
| 南區:209 | 12 → 13 | 09:19 → 09:15 |
| 新市區:271 | 54 → 55 | 20:43 → 20:40 |

## Freshness and completeness limits

Catalog metadata observed 2026-11-19: updated 2026-01-28T16:41:37+08:00; resource update date 2026-01-02; update frequency 不定期更新. These dates describe the catalog, not verified freshness of each stop. Retrieval time is not a schedule revision date.

The endpoint returned HTTP JSON with success=true and errorCode=0, 14190 records, no pagination metadata, and a complete parseable payload (3476290 bytes). The official resource HTML table independently contained 14190 data rows, matching the API. The API size=4582927 field is not interpreted as a byte or record total. All normalized records are retained.

- No per-record update timestamp, operating date range, holiday/suspension exceptions, or real-time vehicle position is supplied.
- No route names, road geometry, travel duration, departure/dwell times, or cross-midnight service-day indicator is supplied.
- Collection and recycling days are independent source fields; recycling days must not be intersected with garbage collection days.
- Published coordinates are retained as supplied; the resource does not declare its coordinate reference system.
- A successful complete API response establishes dataset coverage, not completeness of every real-world Tainan service.

The app must say **班表估算／非即時 GPS**. A passed scheduled time does not establish that a truck has passed, arrived, or departed. Route connections join ordered points and are not road geometry. Holidays and temporary changes require checking the official service.

## District coverage

| District | Routes | Route-stop records |
| --- | ---: | ---: |
| 七股區 | 4 | 66 |
| 下營區 | 10 | 143 |
| 大內區 | 2 | 57 |
| 山上區 | 2 | 40 |
| 中西區 | 16 | 986 |
| 仁德區 | 13 | 778 |
| 六甲區 | 4 | 156 |
| 北門區 | 3 | 56 |
| 北區 | 19 | 1175 |
| 左鎮區 | 1 | 41 |
| 永康區 | 30 | 1785 |
| 玉井區 | 3 | 46 |
| 白河區 | 24 | 126 |
| 安平區 | 8 | 692 |
| 安定區 | 17 | 640 |
| 安南區 | 25 | 1608 |
| 西港區 | 4 | 270 |
| 佳里區 | 14 | 313 |
| 官田區 | 4 | 107 |
| 東山區 | 3 | 160 |
| 東區 | 25 | 1024 |
| 南化區 | 1 | 28 |
| 南區 | 20 | 662 |
| 後壁區 | 4 | 36 |
| 柳營區 | 24 | 515 |
| 將軍區 | 4 | 156 |
| 麻豆區 | 12 | 273 |
| 善化區 | 10 | 228 |
| 新化區 | 13 | 357 |
| 新市區 | 10 | 367 |
| 新營區 | 13 | 537 |
| 楠西區 | 1 | 44 |
| 學甲區 | 6 | 87 |
| 歸仁區 | 10 | 298 |
| 關廟區 | 6 | 179 |
| 鹽水區 | 5 | 154 |

## Reproduction

Offline, using the retained snapshot:

```sh
node scripts/import-tainan-data.mjs --input data/official-snapshot.json --retrieved-at 2026-11-19T05:42:02.314Z
```

Refresh from the official API (requires network):

```sh
node scripts/import-tainan-data.mjs
```

Default files: data/official-snapshot.json, public/data/tainan-routes.json, data/coverage-report.json, data/COVERAGE.md. --input performs no download; --output, --raw, --report, --report-md override paths. --resource-html accepts a downloaded official resource page for independent table-count validation. Recheck catalog metadata dates when refreshing.

Source SHA-256: `6b34a25cf85975ea13a447fa187bb3d11ed6e4d8b93e0ba1a56b49fc11b81e5d`. License: 政府資料開放授權條款－第1版.
