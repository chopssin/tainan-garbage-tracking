# 倒垃圾了 · Tainan Garbage Tracking

## Goal

Help people in Tainan find nearby scheduled garbage collection stops by location and time, without choosing a route. Traditional Chinese, one responsive screen, no account or backend.

## Agreed design

- Location-first search across all official routes; no district or route selector.
- Use device location only after tapping 使用我的位置, or click/tap the map to select a search center. Provide a map-center search button for keyboard use. No coordinate persistence; third-party map tiles reveal the viewed area to the tile service.
- Clearly labeled Tainan city-center example before a location is chosen. Default radius 500 m, adjustable to 1 km, 2 km or 5 km.
- Default time window is Taiwan current time through the next 30 minutes. Date picker, start-time input/slider and adjustable 15–180 minute duration. Return-to-now restores 30 minutes.
- For each unselected matching route show exactly one earliest matching current/up-next stop (blinking orange), plus its immediate source-order previous (gray) and next (light orange) stop. Break time ties by source order. At route ends or missing coordinates show fewer, never wrap or skip to a nonadjacent stop. No separate stop list. Tapping a stop reveals its whole route; a collapse button restores the filtered view. Context stops may be outside radius/time or inactive that day, and are explicitly labeled as references. Missing-coordinate stops cannot be mapped. Search independently on each civil date across midnight.
- Preserve map zoom and position on route expansion, collapse, stop focus and popup opening. After initial framing, only explicit map controls/gestures change zoom; choosing a new search location recenters without changing zoom. Hide temple, church, prayer-room and other religious POI symbols on the base map.
- Expanded routes retain timetable status colors; hollow markers indicate nonmatching context stops. Only connect adjacent visible source stops on the same date; never bridge hidden points.
- Explain empty results and location errors. Map selection supersedes a pending geolocation request.
- Always say **班表估算 · 非即時 GPS**. Markers are scheduled stops, not running trucks or confirmed arrival positions.

## Data rules

Use Asia/Taipei regardless of the visitor's timezone. Collection and recycling days are independent. Unknown values remain unknown. Keep backward times unchanged on the selected civil date and show a warning; do not infer overnight service. No holiday exceptions, suspensions, or live location are supplied.

Current snapshot: 370 routes, 14,190 route-stop records, 36/37 districts; 龍崎區 absent. There are 11 backward time transitions across 10 routes and 465 records with recycling days outside garbage days. See `data/COVERAGE.md` for actual coverage, provenance, validation, and missing information. Never claim complete real-world city coverage from dataset coverage alone.

## Implementation

Vite + React + TypeScript, plain CSS, Leaflet, Vitest, Node 24. Retain the small starter structure and repository-relative asset loading. No API keys, analytics, backend location storage, or vehicle GPS integration. Browser geolocation is optional and user initiated. Official data is bundled as a static snapshot; the base map uses OpenFreeMap vector tiles (OpenMapTiles/OpenStreetMap) with religious POIs filtered out. Pinned MapLibre browser bundles are in src/vendor with licenses and provenance.

## Acceptance criteria

- Location selection, radius/time filtering, hidden points, midnight/day handling, geolocation fallback and stop details work on desktop and narrow screens with keyboard access.
- `npm run check` verifies reproducibility of the data/reports, meaningful tests, types, and production build.
- The production preview loads at `/tainan-garbage-tracking/`, including JSON and map assets.
- Local preview has been reviewed and GitHub Pages deployment is authorized. Repository `chopssin/tainan-garbage-tracking` uses GitHub Actions with `PAGES_ENABLED=true`; successful pushes to `main` deploy to https://chopssin.github.io/tainan-garbage-tracking/.

## Current iteration

Publication authorized: each unselected matching route shows one blinking current/up-next stop, one gray previous stop and one light-orange next stop. Selected routes expand without changing the viewport. Main deploys automatically after checks pass.
