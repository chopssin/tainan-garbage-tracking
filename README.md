# 倒垃圾了 · Tainan Garbage Tracking

A Traditional Chinese timetable map for Tainan garbage collection. **班表估算 · 非即時 GPS**: it shows published scheduled times, not vehicle locations or arrival confirmation.

Choose your location or click the map, then see nearby scheduled stops across all routes. The default window runs from now through the next 30 minutes with a 500 m radius; adjust the date, start-time slider, duration, or radius. Each unselected matching route shows one blinking current/up-next stop, its previous stop in gray, and its next stop in light orange. Route ends or missing coordinates can yield fewer than three markers. Tap a stop to reveal its entire route; collapse to return to the filtered view. There is no separate stop list. Location access is requested only when you tap 使用我的位置; it is not stored. The map tile service receives requests for the viewed area. Recycling days are shown separately from garbage collection days.

## Run locally

Use Node 24 (see `.nvmrc`):

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. No API key or account is required. The bundled timetable works without an API connection; map tiles require internet access. The OpenFreeMap vector base map hides religious POIs while retaining street labels; expanding a collection route preserves the current map view.

```sh
npm run check
BASE_PATH=/tainan-garbage-tracking/ npm run build
BASE_PATH=/tainan-garbage-tracking/ npm run preview
```

The last two commands exercise the production repository path. `npm run check` verifies data, tests, TypeScript, and the build.

## Official data and actual coverage

The [Tainan Environmental Protection Bureau dataset](https://data.tainan.gov.tw/DataSet/Detail/57aaa860-bb03-43c2-a797-73971d6cc73d) snapshot downloaded on 2026-11-19 contains **14,190 route-stop records, 370 routes, and 36 of 37 districts**. 龍崎區 is absent; this does not mean it has no collection service. Every source row is retained. Counts describe scheduled route visits, not unique physical stops.

- No invalid/missing times, coordinates, route orders, or collection-day fields in this snapshot; no duplicate records or order gaps.
- 11 backward time transitions in 10 routes are flagged, not corrected or assumed to cross midnight.
- 465 records have recycling days outside garbage collection days. Those days do not create garbage countdowns.
- The resource says updated 2026-01-02. Downloading it later does not establish that each stop was updated.
- No live GPS, actual arrival, holiday/suspension exceptions, service validity dates, road paths, dwell times, or per-stop revision dates are provided.

See [the coverage report](data/COVERAGE.md) for district totals and exceptions. Data is attributed under the [Government Open Data License, Version 1](https://data.gov.tw/license).

`data/official-snapshot.json` retains the original response. `public/data/tainan-routes.json` is generated for the app; do not hand-edit it. `data/coverage-report.json` and `data/COVERAGE.md` are generated audit outputs. `npm run data:check` reproduces and compares them, verifies the source hash, and ensures each source row occurs exactly once.

Refresh deliberately when online:

```sh
npm run data:refresh
npm run check
```

Review catalog dates in `scripts/import-tainan-data.mjs`, the new report, missing districts, and changes before committing. The importer rejects empty/error/paginated responses and keeps missing or invalid schedule values unknown instead of fabricating a schedule. A fresh import without `--resource-html` does not repeat the independent HTML row-count comparison made for the initial snapshot.

## Recovered prototype

Adapted from the user's **倒垃圾了｜台南清運時刻地圖** prototype in “API for Garbage Trucks.” The saved source in the earlier task supplied the visual direction, favicon, Leaflet route arrows, date/time preview, and timetable logic. The original hosted Site remains untouched. Its private source checkout was unavailable in this session, so recovery used those recorded source files rather than a verified current checkout.

The prototype's three routes/78 stops were replaced by the full official snapshot. Core logic was migrated to typed React components and tested; its automatic midnight rollover assumption was removed because the complete dataset contains inconsistent times. Markers now describe scheduled status explicitly.

## Project layout

- `src/App.tsx`: location, radius and time controls, results and source explanation.
- `src/nearby.ts`: distance/time filtering, cross-date visits and visible-only connections.
- `src/RouteMap.tsx`: Leaflet map, directed connections, marker selection.
- `src/schedule.ts`: Taiwan time and timetable states.
- `scripts/`: deterministic data import and validation.
- `PROJECT.md`: current design and acceptance criteria; `AGENTS.md`: concise contributor guidance.

OpenStreetMap attribution remains visible. Tiles use the public service without prefetching or offline bulk downloads; see its [usage policy](https://operations.osmfoundation.org/policies/tiles/) before substantial scaling. Missing tiles do not prevent timetable use.

## GitHub and deployment

Public repository: [chopssin/tainan-garbage-tracking](https://github.com/chopssin/tainan-garbage-tracking), created from `chopssin/webapp-starter`. GitHub Pages: [倒垃圾了｜台南清運時刻地圖](https://chopssin.github.io/tainan-garbage-tracking/).

GitHub Actions runs checks on pushes and pull requests. Successful pushes to `main` deploy automatically. This repository uses these settings:

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables:** `PAGES_ENABLED` is set to `true`.
3. Run the workflow or push to `main`. GitHub supplies the per-repository base path and a short-lived deployment token; no stored personal token or app API key is needed.

To pause future deployments, remove `PAGES_ENABLED` or set it to `false`. This does not unpublish the existing site. The Actions workflow and base-path support are inherited from the starter.
