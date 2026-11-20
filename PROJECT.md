# 倒垃圾了 · Tainan Garbage Tracking

## Goal

Help people in Tainan find nearby scheduled garbage collection stops by location and time, without choosing a route. Traditional Chinese, one responsive screen, no account or backend.

## Agreed design

- Follow the supplied two-state sketch: pale green single column, 台南倒垃圾！ title, square map, weekday/date picker beside 回到現在, time slider, concise disclaimer and source disclosure.
- Initial map view is approximately 500 m × 500 m. The viewport is the search area; pan/zoom to explore. No radius selector, route selector, sidebar, or stop list.
- At visible areas ≤2 km² show all geocoded stops as hollow reference markers, including stops without service that day. At larger areas hide these background references.
- Keep the forward 30-minute timetable window. Each matching route shows one orange current/up-next stop and its immediate source-order next stop in lighter orange, with a directed connection. Missing neighbors are not invented.
- Tapping any stop reveals that route's full source-order connections; all stops from other routes are hidden until collapse. Closing a stop popup clears only its detail selection, keeps the route revealed, and remains closed after panning, zooming or time refreshes; tapping a stop opens details again. Selecting, expanding, and collapsing do not move or zoom the map.
- Stop popup includes name, date/time, route, garbage/recycling days, and a Google Maps link for that public stop's coordinates. Hollow stops do not imply service that day.
- Date picker shows weekday and month/day; normal time slider spans 06:00–22:00. Return-to-now uses actual Taiwan current time, extending the slider range outside those hours. Default/current time advances automatically.
- My-location button sits inside the map at bottom right. Permission is user initiated; denial/unavailability falls back to map panning. Ignore late location results after the user moves the map. No coordinate persistence; map services receive viewed-area requests.
- Retain manual zoom buttons and keyboard operation. Preserve zoom when locating; initial framing is the only automatic zoom. Religious base-map POIs remain hidden.
- Always label **班表估算 · 非即時 GPS**; no truck positions or confirmed arrivals are inferred.

## Data rules

Use Asia/Taipei regardless of the visitor's timezone. Collection and recycling days are independent. Unknown values remain unknown. Keep backward times unchanged on the selected civil date and show a warning; do not infer overnight service. No holiday exceptions, suspensions, or live location are supplied.

Current snapshot: 370 routes, 14,190 route-stop records, 36/37 districts; 龍崎區 absent. There are 11 backward time transitions across 10 routes and 465 records with recycling days outside garbage days. See `data/COVERAGE.md` for actual coverage, provenance, validation, and missing information. Never claim complete real-world city coverage from dataset coverage alone.

## Implementation

Vite + React + TypeScript, plain CSS, Leaflet, Vitest, Node 24. Retain the small starter structure and repository-relative asset loading. No API keys, analytics, backend location storage, or vehicle GPS integration. Browser geolocation is optional and user initiated. Official data is bundled as a static snapshot; the base map uses OpenFreeMap vector tiles (OpenMapTiles/OpenStreetMap) with religious POIs filtered out. Pinned MapLibre browser bundles are in src/vendor with licenses and provenance.

## Acceptance criteria

- Viewport filtering and 2 km² threshold, route selection, midnight/day handling, geolocation fallback and stop details work on desktop and narrow screens with keyboard access.
- `npm run check` verifies reproducibility of the data/reports, meaningful tests, types, and production build.
- The production preview loads at `/tainan-garbage-tracking/`, including JSON and map assets.
- Local preview has been reviewed and GitHub Pages deployment is authorized. Repository `chopssin/tainan-garbage-tracking` uses GitHub Actions with `PAGES_ENABLED=true`; successful pushes to `main` deploy to https://chopssin.github.io/tainan-garbage-tracking/.

## Current iteration

Publication authorized: persistent popup dismissal, exclusive selected-route visibility, and the supplied truck icon as favicon and header icon. Main deploys automatically after checks pass.
