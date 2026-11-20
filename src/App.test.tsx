import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App, { Timetable } from './App'
import { dataset } from './test/fixtures'
import type { Bounds } from './viewport'
import type { Visit } from './nearby'
vi.mock('./RouteMap', () => ({
  default: ({
    visits,
    onBounds,
    onLocate,
  }: {
    visits: Visit[]
    onBounds: (b: Bounds) => void
    onLocate: () => void
  }) => (
    <div>
      <span>{visits.length} 個地圖站點</span>
      <button onClick={onLocate}>使用我的位置</button>
      <button
        onClick={() =>
          onBounds({
            north: 23.102,
            south: 23.098,
            east: 120.302,
            west: 120.298,
          })
        }
      >
        測試區域
      </button>
      <button
        onClick={() =>
          onBounds({
            north: 25.002,
            south: 24.998,
            east: 121.002,
            west: 120.998,
          })
        }
      >
        遠方區域
      </button>
    </div>
  ),
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
function preview() {
  fireEvent.change(screen.getByLabelText('日期（台灣時間）'), {
    target: { value: '2026-11-19' },
  })
  fireEvent.change(screen.getByLabelText('時間滑桿'), {
    target: { value: '1080' },
  })
  fireEvent.click(screen.getByText('測試區域'))
}
it('uses viewport search and compact date/slider controls', () => {
  render(<Timetable data={dataset} />)
  preview()
  expect(screen.getByText('週四（11/19）')).toBeTruthy()
  expect(screen.queryByLabelText('搜尋半徑')).toBeNull()
  expect(screen.getByText('4 個地圖站點')).toBeTruthy()
  fireEvent.click(screen.getByText('遠方區域'))
  expect(screen.getByText('0 個地圖站點')).toBeTruthy()
})
it('requests location only on demand and supports denial', () => {
  const getCurrentPosition = vi.fn((_success, error) => error({ code: 1 }))
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  render(<Timetable data={dataset} />)
  expect(getCurrentPosition).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('使用我的位置'))
  expect(screen.getByText('未允許定位，請拖曳地圖選擇區域。')).toBeTruthy()
})
it('ignores location results after the user moves the map', () => {
  let success: (p: GeolocationPosition) => void = () => {}
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: vi.fn((fn) => {
        success = fn
      }),
    },
  })
  render(<Timetable data={dataset} />)
  fireEvent.click(screen.getByText('使用我的位置'))
  fireEvent.click(screen.getByText('遠方區域'))
  act(() =>
    success({
      coords: { latitude: 23.1, longitude: 120.3 },
    } as GeolocationPosition),
  )
  expect(screen.getByText('0 個地圖站點')).toBeTruthy()
  expect(screen.getByText('台南市中心示範區域 · 拖曳地圖選擇位置')).toBeTruthy()
})
it('returns to actual current time, including outside normal slider hours', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-19T15:30:00Z'))
  render(<Timetable data={dataset} />)
  preview()
  fireEvent.click(screen.getByText('回到現在'))
  expect((screen.getByLabelText('時間滑桿') as HTMLInputElement).value).toBe(
    '1410',
  )
  expect(
    (screen.getByLabelText('日期（台灣時間）') as HTMLInputElement).value,
  ).toBe('2026-11-19')
  expect(
    screen.getByText('目前時間 · 台灣時間 · 顯示所選時間起 30 分鐘'),
  ).toBeTruthy()
})
it('recovers from a failed data request', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValue({ ok: true, json: async () => dataset }),
  )
  render(<App />)
  fireEvent.click(await screen.findByText('重新載入'))
  await waitFor(() => expect(screen.getByText('使用我的位置')).toBeTruthy())
})
