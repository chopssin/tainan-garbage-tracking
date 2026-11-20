import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { maplibreGL } from './vendor/leaflet-maplibre-gl.mjs'
import { setWorkerUrl } from './vendor/maplibre-gl.mjs'
import workerUrl from './vendor/maplibre-gl-worker.mjs?worker&url'
import './vendor/maplibre-gl.css'
setWorkerUrl(workerUrl)
import { visibleConnections } from './nearby'
import type { Location, Visit } from './nearby'
interface Props {
  expanded: boolean
  onCollapse: () => void
  center: Location
  radius: number
  visits: Visit[]
  selectedId: string | null
  onSelect: (id: string) => void
  onLocation: (point: Location) => void
}
export default function RouteMap({
  expanded,
  onCollapse,
  center,
  radius,
  visits,
  selectedId,
  onSelect,
  onLocation,
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
      scrollWheelZoom: false,
      minZoom: 7,
      maxZoom: 19,
    }).setView([22.99, 120.205], 14)
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
    instance.on('click', (e: L.LeafletMouseEvent) =>
      onLocation({ lat: e.latlng.lat, lng: e.latlng.lng }),
    )
    const observer = new ResizeObserver(() =>
      instance.invalidateSize({ pan: false }),
    )
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
    }
  }, [onLocation])
  const initialArea = useRef(true)
  const previousCenter = useRef(center)
  useEffect(() => {
    const instance = map.current,
      layer = areaLayer.current
    if (!instance || !layer) return
    layer.clearLayers()
    const circle = L.circle([center.lat, center.lng], {
      radius,
      color: '#496f9a',
      weight: 2,
      fillOpacity: 0.04,
      interactive: false,
    }).addTo(layer)
    L.circleMarker([center.lat, center.lng], {
      radius: 7,
      color: '#fff',
      weight: 3,
      fillColor: '#3269a3',
      fillOpacity: 1,
      interactive: false,
    }).addTo(layer)
    if (initialArea.current) {
      instance.fitBounds(circle.getBounds(), {
        padding: [20, 55],
        animate: false,
      })
      initialArea.current = false
    } else if (previousCenter.current !== center) {
      instance.panTo([center.lat, center.lng], { animate: false })
    }
    previousCenter.current = center
  }, [center, radius])
  useEffect(() => {
    const instance = map.current,
      layer = stopsLayer.current
    if (!instance || !layer) return
    layer.clearLayers()
    markers.current.clear()
    for (const [from, to] of visibleConnections(visits)) {
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
      dot.className = `marker-dot ${visit.state}${visit.context ? ' context' : ''}`
      dot.textContent = visit.state === 'next' ? visit.route.sourceRouteId : ''
      const size = visit.state === 'next' ? 32 : 14
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
      popup.textContent = `${visit.stop.name}\n${visit.date} ${visit.stop.time} · ${visit.route.district} ${visit.route.sourceRouteId} 號\n垃圾：週${visit.stop.rawDays}\n回收：${visit.stop.rawRecyclingDays}\n${visit.context ? '路線參考站（不符合搜尋條件，請確認收運日）' : '符合搜尋條件'}\n班表估算，非實際到站確認。`
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
      selected.openPopup()
    }
  }, [selectedId, visits, expanded])
  return (
    <div className="map-shell">
      <div ref={container} className="map" aria-label="附近清運站點互動地圖" />
      <div className="map-heading">
        <strong>點一下地圖，改變搜尋位置</strong>
        <small>藍點為搜尋中心 · 圓圈內 {radius / 1000} km</small>
      </div>
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
        <button
          aria-label="回到搜尋範圍"
          onClick={() =>
            map.current?.fitBounds(
              L.latLng(center.lat, center.lng).toBounds(radius * 2),
              { padding: [20, 55] },
            )
          }
        >
          ⤢
        </button>
        <button aria-label="放大地圖" onClick={() => map.current?.zoomIn()}>
          ＋
        </button>
        <button aria-label="縮小地圖" onClick={() => map.current?.zoomOut()}>
          −
        </button>
        <button
          aria-label="以地圖中心搜尋"
          title="以地圖中心搜尋"
          onClick={() => {
            const p = map.current?.getCenter()
            if (p) onLocation({ lat: p.lat, lng: p.lng })
          }}
        >
          ⌖
        </button>
      </div>
      {tileError && (
        <div className="tile-notice">
          底圖暫時無法完整載入，仍可點選站點查看班表。
        </div>
      )}
      <div className="map-key">
        <span>
          <i className="past" />
          表定已過
        </span>
        <span>
          <i className="next" />
          各路線下一站
        </span>
        <span>
          <i className="future" />
          稍後班次
        </span>
      </div>
      <span className="map-note">空心點為路線參考；連線非行車道路</span>
    </div>
  )
}
