# 倒垃圾了 · Tainan Garbage Tracking

## Goal

Help people in Tainan find nearby scheduled garbage collection stops by location and time, without choosing a route. Traditional Chinese and English, one responsive screen, no account or backend.

## Agreed design

- Follow the supplied two-state sketch: dark charcoal single column with off-white text, muted captions and pale-green accents, 台南倒垃圾！ title, square map, weekday/date picker beside 回到現在, time slider, concise disclaimer and source disclosure.
- Initial map view is approximately 500 m × 500 m. The viewport is the search area; pan/zoom to explore. No radius selector, route selector, sidebar, or stop list.
- At visible areas ≤2 km² show all geocoded stops as hollow reference markers, including stops without service that day. At larger areas hide these background references.
- Keep the forward 30-minute timetable window. Each matching route shows one orange current/up-next stop and its immediate source-order next stop in lighter orange, with a directed connection. Missing neighbors are not invented.
- Tapping any stop reveals that route's full source-order connections; all stops from other routes are hidden until collapse. Closing a stop popup clears only its detail selection, keeps the route revealed, and remains closed after panning, zooming or time refreshes; tapping a stop opens details again. Selecting, expanding, and collapsing do not move or zoom the map.
- Stop popups are dark rectangles with subtly rounded corners and no triangular tip. Each shows a larger bold scheduled time, address, then 垃圾／回收 weekdays without a 週 prefix. Place a rounded pale-green Google Maps button below with spacing and visible hover/keyboard-focus states. Omit route information, the date and explanatory text from the popup; retain the page timetable disclaimer. Hollow stops do not imply service that day.
- Date picker shows weekday and month/day; normal time slider spans 06:00–22:00. Return-to-now uses actual Taiwan current time, extending the slider range outside those hours. Default/current time advances automatically.
- My-location button sits immediately left of Now in the date row: a 45px square matching the Now button height, with a centered SVG location icon. Permission is user initiated; denial/unavailability falls back to map panning. Ignore late location results after the user moves the map. No coordinate persistence; map services receive viewed-area requests.
- Retain manual zoom buttons and keyboard operation. Preserve zoom when locating; initial framing is the only automatic zoom. Religious base-map POIs remain hidden.
- Header has a themed 中 | En switch with active and keyboard-focus states; a valid saved choice takes priority; otherwise use Traditional Chinese when the browser's first preferred language is Chinese (zh or zh-*), and English for other languages. The language preference is remembered when browser storage is available. Translate controls, status/errors, collection days and disclosures without resetting the view or time. Official addresses and map labels retain their source language.
- Keep the timetable-versus-live-GPS disclaimer in the footer in both languages; no truck positions or confirmed arrivals are inferred.

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

Publication authorized for SEO basics: canonical GitHub Pages URL, bilingual search and sharing metadata, 1200×630 sharing image, single-URL sitemap and initial-HTML introduction with collapsed FAQ below the existing app. Browser language updates the visible guide and metadata; this is one bilingual page, not separate indexed language URLs. Keywords include 台南垃圾、台南垃圾車時間、台南倒垃圾時間 and Tainan garbage collection schedule. Link the official query system as a reference, not as our canonical or claimed operator. Preserve the existing map UI. Main deploys automatically after checks pass. Search Console verification and sitemap submission follow deployment.
