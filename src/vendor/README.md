# Browser map renderer
Pinned prebuilt distributions from npm, downloaded 2026-11-20 and checked against registry SHA-512 integrity:
- maplibre-gl 6.19.0 (BSD-3-Clause), including its shared module and worker.
- @maplibre/maplibre-gl-leaflet 0.1.4 (ISC); its MapLibre import is changed to the adjacent bundled module.
Licenses are included alongside the bundles. These browser distributions contain their runtime dependencies and require no install scripts. Upgrade together and verify the map preview. Do not hand-edit minified bundles.

The OpenFreeMap Liberty style in public/data/basemap-style.json is based on https://tiles.openfreemap.org/styles/liberty, with place_of_worship and religious subclasses excluded from POI layers. Street and place labels are retained, preferring Traditional Chinese or the local name. OpenFreeMap/OpenMapTiles/OpenStreetMap attribution must remain visible.
