import { render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import L from 'leaflet'
import RouteMap from './RouteMap'
import { nearbyVisits, mapVisits } from './nearby'
import { dataset } from './test/fixtures'

vi.mock('./vendor/leaflet-maplibre-gl.mjs', () => ({
  maplibreGL: () => ({
    addTo: () => ({ getMaplibreMap: () => ({ on: vi.fn() }) }),
  }),
}))
vi.mock('./vendor/maplibre-gl.mjs', () => ({ setWorkerUrl: vi.fn() }))
vi.mock('./vendor/maplibre-gl-worker.mjs?worker&url', () => ({
  default: '/worker.js',
}))
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('preserves the viewport when expanding, selecting, collapsing and changing radius', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  // Leaflet's SVG capability probe needs an SVG API absent from jsdom.
  const svg = Object.getOwnPropertyDescriptor(L.Browser, 'svg')!
  Object.defineProperty(L.Browser, 'svg', { ...svg, value: true })
  try {
    const center = { lat: 23.1, lng: 120.3 }
    const clock = { date: '2026-11-19', seconds: 18 * 3600 }
    const matches = nearbyVisits(dataset, center, 500, clock, 30)
    const props = {
      center,
      radius: 500,
      visits: matches,
      selectedId: null as string | null,
      expanded: false,
      onCollapse: vi.fn(),
      onSelect: vi.fn(),
      onLocation: vi.fn(),
    }
    const view = render(<RouteMap {...props} />)
    const fit = vi.spyOn(L.Map.prototype, 'fitBounds')
    const pan = vi.spyOn(L.Map.prototype, 'panTo')
    const setView = vi.spyOn(L.Map.prototype, 'setView')
    const popup = vi.spyOn(L.Marker.prototype, 'bindPopup')
    const expanded = mapVisits(matches, center, clock, matches[0]!.route.id)
    view.rerender(
      <RouteMap
        {...props}
        expanded
        visits={expanded}
        selectedId={matches[0]!.id}
      />,
    )
    expect(
      popup.mock.calls.every(([, options]) => options?.autoPan === false),
    ).toBe(true)
    view.rerender(<RouteMap {...props} radius={1000} />)
    expect(fit).not.toHaveBeenCalled()
    expect(pan).not.toHaveBeenCalled()
    expect(setView).not.toHaveBeenCalled()
    view.unmount()
  } finally {
    Object.defineProperty(L.Browser, 'svg', svg)
  }
})
