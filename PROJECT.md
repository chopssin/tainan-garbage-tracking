# 倒垃圾了 · Tainan Garbage Tracking

## Goal

Help people in Tainan choose a garbage collection route and understand its published timetable. Traditional Chinese, one responsive screen, no account or backend.

## Agreed design

- District and route selection using every record in the official Tainan collection-point resource.
- Numbered stops joined in official order, with direction arrows. Connections are straight lines, not driving directions.
- Passed, current/next, and upcoming markers, with a countdown to the scheduled time. Inactive and unknown stops remain visible.
- Taiwan date/time preview, a full-day slider, playback, and return to the current clock.
- Selecting a stop opens its map location and schedule; the list works when the map tiles cannot load.
- Always say **班表估算 · 非即時 GPS**. A passed time is not proof that a truck passed. Highlight all stops sharing the next scheduled minute; do not invent a precise vehicle position or dwell time.

## Data rules

Use Asia/Taipei regardless of the visitor's timezone. Collection and recycling days are independent. Unknown values remain unknown. Keep backward times unchanged on the selected civil date and show a warning; do not infer overnight service. No holiday exceptions, suspensions, or live location are supplied.

Current snapshot: 370 routes, 14,190 route-stop records, 36/37 districts; 龍崎區 absent. There are 11 backward time transitions across 10 routes and 465 records with recycling days outside garbage days. See `data/COVERAGE.md` for actual coverage, provenance, validation, and missing information. Never claim complete real-world city coverage from dataset coverage alone.

## Implementation

Vite + React + TypeScript, plain CSS, Leaflet, Vitest, Node 24. Retain the small starter structure and repository-relative asset loading. No API keys, geolocation, analytics, or live GPS integration. Official data is bundled as a static snapshot; map tiles come from OpenStreetMap.

## Acceptance criteria

- District/route selection, directed map, stop details, date/time preview, countdowns, and off-day states work on desktop and narrow screens with keyboard access.
- `npm run check` verifies reproducibility of the data/reports, meaningful tests, types, and production build.
- The production preview loads at `/tainan-garbage-tracking/`, including JSON and map assets.
- Local preview is reviewed before deployment. GitHub repository creation/push is deferred under the user's “Finish locally first” instruction. Pages stays opt-in with `PAGES_ENABLED=true`; do not enable or deploy until authorized.
