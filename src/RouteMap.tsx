import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Route, StopStatus } from './types'
import { statusLabels } from './schedule'

interface Props {
  route: Route
  states: StopStatus[]
  selectedId: string | null
  onSelect: (id: string) => void
}
export default function RouteMap({
  route,
  states,
  selectedId,
  onSelect,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const fit = useRef<() => void>(() => {})
  const [tileError, setTileError] = useState(false)
  const stateKey = states.join(',')
  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      minZoom: 8,
      maxZoom: 19,
    })
    map.current = instance
    instance.setView([23.05, 120.3], 12)
    setTileError(false)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    })
      .on('tileerror', () => setTileError(true))
      .addTo(instance)
    const arrows: { marker: L.Marker; from: L.LatLng; to: L.LatLng }[] = []
    const bounds: L.LatLng[] = []
    route.stops.forEach((stop, index) => {
      if (stop.lat === null || stop.lng === null) return
      const position = L.latLng(stop.lat, stop.lng)
      bounds.push(position)
      const previous = route.stops[index - 1]
      // Don't bridge a missing coordinate: that portion of the route is unknown.
      if (previous?.lat != null && previous.lng != null) {
        const from = L.latLng(previous.lat, previous.lng)
        L.polyline([from, position], {
          color: '#6b8072',
          weight: 3,
          opacity: 0.7,
          interactive: false,
        }).addTo(instance)
        if (!from.equals(position)) {
          const arrow = L.marker(
            [(from.lat + position.lat) / 2, (from.lng + position.lng) / 2],
            {
              interactive: false,
              keyboard: false,
              zIndexOffset: -100,
              icon: L.divIcon({
                className: 'route-arrow',
                html: '<span aria-hidden="true">➤</span>',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              }),
            },
          ).addTo(instance)
          arrows.push({ marker: arrow, from, to: position })
        }
      }
      const marker = L.marker(position, {
        keyboard: true,
        riseOnHover: true,
        title: `第 ${stop.order ?? index + 1} 站 ${stop.name}`,
      })
      const popup = document.createElement('div'),
        title = document.createElement('strong'),
        description = document.createElement('p')
      title.textContent = stop.name
      description.textContent = `表定 ${stop.time ?? '未知'} · ${stop.village}\n垃圾：週${stop.rawDays}\n回收：${stop.rawRecyclingDays}\n時刻表推估，非實際到站確認。`
      popup.append(title, description)
      marker
        .bindPopup(popup, { maxWidth: 260 })
        .on('click', () => onSelect(stop.id))
        .addTo(instance)
      markers.current.set(stop.id, marker)
    })
    const orient = () =>
      arrows.forEach(({ marker, from, to }) => {
        const a = instance.latLngToLayerPoint(from),
          b = instance.latLngToLayerPoint(to)
        const span = marker.getElement()
          ?.firstElementChild as HTMLElement | null
        if (span)
          span.style.transform = `rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI}deg)`
      })
    instance.on('zoomend', orient)
    fit.current = () => {
      if (bounds.length)
        instance.fitBounds(L.latLngBounds(bounds), {
          padding: [42, 65],
          maxZoom: 15,
          animate: false,
        })
      orient()
    }
    fit.current()
    const observer = new ResizeObserver(() => {
      instance.invalidateSize()
      orient()
    })
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
      markers.current.clear()
    }
  }, [route, onSelect])
  useEffect(() => {
    const statuses = stateKey.split(',') as StopStatus[]
    route.stops.forEach((stop, index) => {
      const marker = markers.current.get(stop.id),
        state = statuses[index]!
      if (!marker) return
      const number = document.createElement('span')
      number.className = `marker-dot ${state} ${selectedId === stop.id ? 'selected' : ''}`
      number.textContent = String(stop.order ?? index + 1)
      marker.setIcon(
        L.divIcon({
          className: 'stop-marker',
          html: number,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -16],
        }),
      )
      marker.setZIndexOffset(
        selectedId === stop.id ? 1200 : state === 'next' ? 800 : 0,
      )
      marker
        .getElement()
        ?.setAttribute(
          'aria-label',
          `第 ${stop.order ?? index + 1} 站 ${stop.name}，${stop.time ?? '時間未知'}，${statusLabels[state]}`,
        )
    })
  }, [route, stateKey, selectedId])
  useEffect(() => {
    const marker = selectedId ? markers.current.get(selectedId) : null
    if (marker && map.current) {
      map.current.setView(
        marker.getLatLng(),
        Math.max(map.current.getZoom(), 15),
        { animate: false },
      )
      marker.openPopup()
    }
  }, [selectedId, route])
  return (
    <div className="map-shell">
      <div
        ref={container}
        className="map"
        aria-label={`${route.district} ${route.sourceRouteId} 號清運路線地圖`}
      />
      <div className="map-heading">
        <strong>
          {route.district} · {route.sourceRouteId} 號路線
        </strong>
        <small>依官方清運次序連接站點</small>
      </div>
      <div className="map-controls">
        <button aria-label="查看完整路線" onClick={() => fit.current()}>
          ⤢
        </button>
        <button aria-label="放大地圖" onClick={() => map.current?.zoomIn()}>
          ＋
        </button>
        <button aria-label="縮小地圖" onClick={() => map.current?.zoomOut()}>
          −
        </button>
      </div>
      {tileError && (
        <div className="tile-notice" role="status">
          底圖暫時無法完整載入，仍可查看站點與清單。
        </div>
      )}
      <div className="map-key">
        {states.includes('inactive') && (
          <span>
            <i className="inactive" />
            當日無垃圾
          </span>
        )}
        {states.includes('unknown') && (
          <span>
            <i className="unknown" />
            班表待確認
          </span>
        )}
        <span>
          <i className="past" />
          表定已過
        </span>
        <span>
          <i className="next" />
          當前／下一站
        </span>
        <span>
          <i className="future" />
          尚未到時
        </span>
      </div>
      <span className="map-note">箭頭表示站點順序，並非行車道路</span>
    </div>
  )
}
