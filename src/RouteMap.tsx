import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { maplibreGL } from './vendor/leaflet-maplibre-gl.mjs'
import { setWorkerUrl } from './vendor/maplibre-gl.mjs'
import workerUrl from './vendor/maplibre-gl-worker.mjs?worker&url'
import './vendor/maplibre-gl.css'
setWorkerUrl(workerUrl)
import { visibleConnections } from './nearby'
import type { Location } from './nearby'
import type { Bounds, MapStop } from './viewport'
interface Props {
  expanded: boolean
  onCollapse: () => void
  location: Location | null
  onLocate: () => void
  locating: boolean
  onBounds: (bounds: Bounds) => void
  visits: MapStop[]
  selectedId: string | null
  onSelect: (id: string) => void
}
export default function RouteMap({
  expanded,
  onCollapse,
  location,
  onLocate,
  locating,
  onBounds,
  visits,
  selectedId,
  onSelect,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null)
  const stopsLayer = useRef<L.LayerGroup | null>(null),
    areaLayer = useRef<L.LayerGroup | null>(null)
  const markers = useRef(new Map<string, L.Marker>()),
    [tileError, setTileError] = useState(false)
  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, {
      zoomControl: false,
      scrollWheelZoom: true,
      zoomSnap: 0,
      minZoom: 7,
      maxZoom: 19,
    })
    instance.fitBounds(L.latLng(22.99, 120.205).toBounds(500), {
      animate: false,
    })
    map.current = instance
    try {
      const base = maplibreGL({
        style: `${import.meta.env.BASE_URL}data/basemap-style.json`,
        attribution:
          '<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a> · &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instance)
      base.getMaplibreMap().on('error', () => setTileError(true))
    } catch {
      setTileError(true)
    }
    stopsLayer.current = L.layerGroup().addTo(instance)
    areaLayer.current = L.layerGroup().addTo(instance)
    const reportBounds = () => {
      const b = instance.getBounds()
      onBounds({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      })
    }
    instance.on('moveend', reportBounds)
    instance.on('click', onCollapse)
    reportBounds()
    const observer = new ResizeObserver(() => {
      instance.invalidateSize({ pan: false })
      reportBounds()
    })
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
    }
  }, [onBounds, onCollapse])
  useEffect(() => {
    if (!location || !map.current || !areaLayer.current) return
    areaLayer.current.clearLayers()
    L.circleMarker([location.lat, location.lng], {
      radius: 6,
      color: '#fff',
      weight: 2,
      fillColor: '#3269a3',
      fillOpacity: 1,
      interactive: false,
    }).addTo(areaLayer.current)
    map.current.panTo([location.lat, location.lng], { animate: false })
  }, [location])
  useEffect(() => {
    const instance = map.current,
      layer = stopsLayer.current
    if (!instance || !layer) return
    layer.clearLayers()
    markers.current.clear()
    for (const [from, to] of visibleConnections(
      visits.filter((v) => v.connected),
    )) {
      const a = L.latLng(from.stop.lat!, from.stop.lng!),
        b = L.latLng(to.stop.lat!, to.stop.lng!)
      L.polyline([a, b], {
        color: '#718570',
        weight: 2,
        opacity: 0.65,
        interactive: false,
      }).addTo(layer)
      if (!a.equals(b)) {
        const p = instance.project(a),
          q = instance.project(b),
          angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI
        L.marker([(a.lat + b.lat) / 2, (a.lng + b.lng) / 2], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: 'route-arrow',
            html: `<span style="transform:rotate(${angle}deg)" aria-hidden="true">➤</span>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(layer)
      }
    }
    for (const visit of visits) {
      const dot = document.createElement('span')
      dot.className = `marker-dot ${visit.state}${visit.context ? ' context' : ''}${visit.preview ? ' preview' : ''}`
      dot.textContent = ''
      const size = 32
      const marker = L.marker([visit.stop.lat!, visit.stop.lng!], {
        bubblingMouseEvents: false,
        autoPanOnFocus: false,
        title: `${visit.route.district} ${visit.route.sourceRouteId} 號 · ${visit.stop.name} · ${visit.stop.time}`,
        icon: L.divIcon({
          className: 'stop-marker',
          html: dot,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
      })
      const popup = document.createElement('div')
      popup.textContent = `${visit.stop.name}\n${visit.date} ${visit.stop.time} · ${visit.route.district} ${visit.route.sourceRouteId} 號\n垃圾：週${visit.stop.rawDays}\n回收：${visit.stop.rawRecyclingDays}\n${visit.context ? '參考站點，請確認收運日與時間。' : '表定目前／接續班次'}\n班表估算，非實際到站確認。`
      const link = document.createElement('a')
      link.href = `https://www.google.com/maps/search/?api=1&query=${visit.stop.lat},${visit.stop.lng}`
      link.textContent = '在 Google 地圖開啟'
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      popup.append(document.createElement('br'), link)
      marker
        .bindPopup(popup, {
          maxWidth: 220,
          autoPan: false,
        })
        .on('click', () => onSelect(visit.id))
        .addTo(layer)
      marker
        .getElement()
        ?.setAttribute(
          'aria-label',
          `${visit.route.district} ${visit.route.sourceRouteId} 號 · ${visit.stop.name} · ${visit.stop.time}`,
        )
      marker.getElement()?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(visit.id)
        }
      })
      marker.setZIndexOffset(visit.state === 'next' ? 800 : 0)
      markers.current.set(visit.id, marker)
    }
  }, [visits, onSelect])
  useEffect(() => {
    for (const [id, marker] of markers.current)
      marker
        .getElement()
        ?.firstElementChild?.classList.toggle('selected', id === selectedId)
    const selected = selectedId ? markers.current.get(selectedId) : null
    if (selected && map.current) {
      const point = map.current.latLngToContainerPoint(selected.getLatLng())
      const size = map.current.getSize()
      selected.getPopup()!.options.offset = L.point(
        Math.max(130 - point.x, Math.min(0, size.x - 130 - point.x)),
        point.y < 200 ? 210 : 0,
      )
      selected.openPopup()
    }
  }, [selectedId, visits, expanded])
  return (
    <div className="map-shell">
      <div ref={container} className="map" aria-label="附近清運站點互動地圖" />
      <div className="map-controls">
        {expanded && (
          <button
            className="collapse-route"
            aria-label="收合完整路線"
            onClick={onCollapse}
          >
            收合
          </button>
        )}
        <button aria-label="放大地圖" onClick={() => map.current?.zoomIn()}>
          ＋
        </button>
        <button aria-label="縮小地圖" onClick={() => map.current?.zoomOut()}>
          −
        </button>
      </div>
      <button
        className="locate-control"
        aria-label="使用我的位置"
        title="使用我的位置"
        onClick={onLocate}
        disabled={locating}
      >
        {locating ? '…' : '⌖'}
      </button>
      {tileError && (
        <div className="tile-notice">
          底圖暫時無法完整載入，仍可點選站點查看班表。
        </div>
      )}
    </div>
  )
}
