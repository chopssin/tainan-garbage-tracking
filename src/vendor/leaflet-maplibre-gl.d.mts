import type { Layer } from 'leaflet'
export function maplibreGL(options: {style: string; attribution: string}): Layer & {
  getMaplibreMap(): { on(event: string, callback: () => void): void }
}
