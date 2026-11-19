# 倒垃圾了 · Tainan Garbage Tracking

## Goal

Help people in Tainan find nearby scheduled garbage collection stops by location and time, without choosing a route. Traditional Chinese, one responsive screen, no account or backend.

## Agreed design

- Location-first search across all official routes; no district or route selector.
- Use device location only after tapping 使用我的位置, or click/tap the map to select a search center. Provide a map-center search button for keyboard use. No coordinate persistence; third-party map tiles reveal the viewed area to the tile service.
- Clearly labeled Tainan city-center example before a location is chosen. Default radius 1 km, adjustable to 500 m, 2 km or 5 km.
- Default time window is Taiwan current time ±1 hour. Date picker, center-time input/slider and adjustable ±15–180 minute window. Return-to-now restores ±1 hour.
- Hide all out-of-radius, out-of-time, inactive and unknown-coordinate/time/day stops from BOTH map and list. Search independently on each civil date across midnight.
- Display passed, next visible per-route, and upcoming scheduled stops. Only connect adjacent visible source stops on the same date; never bridge hidden points.
- Explain empty results and location errors. Map selection supersedes a pending geolocation request.
- Always say **班表估算 · 非即時 GPS**. Markers are scheduled stops, not running trucks or confirmed arrival positions.

## Data rules

Use Asia/Taipei regardless of the visitor's timezone. Collection and recycling days are independent. Unknown values remain unknown. Keep backward times unchanged on the selected civil date and show a warning; do not infer overnight service. No holiday exceptions, suspensions, or live location are supplied.

Current snapshot: 370 routes, 14,190 route-stop records, 36/37 districts; 龍崎區 absent. There are 11 backward time transitions across 10 routes and 465 records with recycling days outside garbage days. See `data/COVERAGE.md` for actual coverage, provenance, validation, and missing information. Never claim complete real-world city coverage from dataset coverage alone.

## Implementation

Vite + React + TypeScript, plain CSS, Leaflet, Vitest, Node 24. Retain the small starter structure and repository-relative asset loading. No API keys, analytics, backend location storage, or vehicle GPS integration. Browser geolocation is optional and user initiated. Official data is bundled as a static snapshot; map tiles come from OpenStreetMap.

## Acceptance criteria

- Location selection, radius/time filtering, hidden points, midnight/day handling, geolocation fallback and stop details work on desktop and narrow screens with keyboard access.
- `npm run check` verifies reproducibility of the data/reports, meaningful tests, types, and production build.
- The production preview loads at `/tainan-garbage-tracking/`, including JSON and map assets.
- Local preview has been reviewed and GitHub Pages deployment is authorized. Repository `chopssin/tainan-garbage-tracking` uses GitHub Actions with `PAGES_ENABLED=true`; successful pushes to `main` deploy to https://chopssin.github.io/tainan-garbage-tracking/.

## Current iteration

Location-first UX is prepared locally for review. Do not push this iteration until publication is requested; main deploys automatically.
