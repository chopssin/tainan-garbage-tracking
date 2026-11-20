import { useCallback, useState } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import L from 'leaflet'
import RouteMap from './RouteMap'
import { viewportStops } from './viewport'
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

it('preserves the viewport when expanding, selecting, collapsing and updating results', () => {
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
    const clock = { date: '2026-11-19', seconds: 18 * 3600 }
    const bounds = {
      north: 23.102,
      south: 23.098,
      east: 120.302,
      west: 120.298,
    }
    const matches = viewportStops(dataset, bounds, clock, null)
    const props = {
      location: null,
      onLocate: vi.fn(),
      locating: false,
      onBounds: vi.fn(),
      visits: matches,
      selectedId: null as string | null,
      expanded: false,
      onCollapse: vi.fn(),
      onSelect: vi.fn(),
      onDismiss: vi.fn(),
    }
    const view = render(<RouteMap {...props} />)
    const fit = vi.spyOn(L.Map.prototype, 'fitBounds')
    const pan = vi.spyOn(L.Map.prototype, 'panTo')
    const setView = vi.spyOn(L.Map.prototype, 'setView')
    const popup = vi.spyOn(L.Marker.prototype, 'bindPopup')
    const expanded = viewportStops(dataset, bounds, clock, matches[0]!.route.id)
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
    view.rerender(<RouteMap {...props} />)
    expect(fit).not.toHaveBeenCalled()
    expect(pan).not.toHaveBeenCalled()
    expect(setView).not.toHaveBeenCalled()
    view.unmount()
  } finally {
    Object.defineProperty(L.Browser, 'svg', svg)
  }
})

it('keeps dismissed details closed through result updates, then allows reopening', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  const svg = Object.getOwnPropertyDescriptor(L.Browser, 'svg')!
  Object.defineProperty(L.Browser, 'svg', { ...svg, value: true })
  const bounds = { north: 23.102, south: 23.098, east: 120.302, west: 120.298 }
  const visits = viewportStops(
    dataset,
    bounds,
    { date: '2026-11-19', seconds: 18 * 3600 },
    dataset.routes[0]!.id,
  )
  const stable = { onBounds: vi.fn(), onCollapse: vi.fn(), onLocate: vi.fn() }
  function Harness({ updated }: { updated: boolean }) {
    const [selected, setSelected] = useState<string | null>(visits[0]!.id)
    const dismiss = useCallback(
      (id: string) => setSelected((old) => (old === id ? null : old)),
      [],
    )
    return (
      <RouteMap
        {...stable}
        expanded
        location={null}
        locating={false}
        visits={updated ? [...visits] : visits}
        selectedId={selected}
        onSelect={setSelected}
        onDismiss={dismiss}
      />
    )
  }
  try {
    const view = render(<Harness updated={false} />)
    expect(document.querySelector('.leaflet-popup')).not.toBeNull()
    // A bounds/result refresh must not itself dismiss an open popup.
    view.rerender(<Harness updated />)
    expect(document.querySelector('.leaflet-popup')).not.toBeNull()
    fireEvent.click(document.querySelector('.leaflet-popup-close-button')!)
    expect(document.querySelector('.leaflet-popup')).toBeNull()
    view.rerender(<Harness updated={false} />)
    view.rerender(<Harness updated />)
    expect(document.querySelector('.leaflet-popup')).toBeNull()
    expect(document.querySelectorAll('.stop-marker')).toHaveLength(
      visits.length,
    )
    fireEvent.click(document.querySelector('.stop-marker')!)
    expect(document.querySelector('.leaflet-popup')).not.toBeNull()
    view.unmount()
  } finally {
    Object.defineProperty(L.Browser, 'svg', svg)
  }
})
