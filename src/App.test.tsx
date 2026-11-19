import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App, { Timetable } from './App'
import { dataset } from './test/fixtures'
import type { Location, Visit } from './nearby'
vi.mock('./RouteMap', () => ({
  default: ({
    visits,
    onLocation,
  }: {
    visits: Visit[]
    onLocation: (p: Location) => void
  }) => (
    <div aria-label="測試地圖">
      <span>{visits.length} 個地圖站點</span>
      <button onClick={() => onLocation({ lat: 23.1, lng: 120.3 })}>
        指定測試位置
      </button>
      <button onClick={() => onLocation({ lat: 25, lng: 121 })}>
        指定遠方位置
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
  fireEvent.change(screen.getByLabelText('中心時間'), {
    target: { value: '18:00' },
  })
  fireEvent.click(screen.getByText('指定測試位置'))
}
it('searches across routes and hides excluded points from both map and list', () => {
  render(<Timetable data={dataset} />)
  preview()
  expect(screen.queryByLabelText('清運路線')).toBeNull()
  expect(screen.getByText('4 個地圖站點')).toBeTruthy()
  expect(
    screen.getByRole('list', { name: '符合位置與時間的站點' }).children,
  ).toHaveLength(4)
  fireEvent.change(screen.getByLabelText('時間範圍'), {
    target: { value: '15' },
  })
  expect(screen.getByText('3 個地圖站點')).toBeTruthy()
  fireEvent.click(screen.getByText('指定遠方位置'))
  expect(screen.getByText('0 個地圖站點')).toBeTruthy()
  expect(
    screen.getByRole('list', { name: '符合位置與時間的站點' }).children,
  ).toHaveLength(0)
})
it('only requests location on demand and supports denial', () => {
  const getCurrentPosition = vi.fn((_success, error) => error({ code: 1 }))
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  render(<Timetable data={dataset} />)
  expect(getCurrentPosition).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('使用我的位置'))
  expect(screen.getByText('未允許定位。請點選地圖指定位置。')).toBeTruthy()
  fireEvent.click(screen.getByText('指定測試位置'))
  expect(screen.queryByText('未允許定位。請點選地圖指定位置。')).toBeNull()
})
it('ignores a late location callback after the user chooses a map point', () => {
  let success: (p: GeolocationPosition) => void = () => {}
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: vi.fn((fn) => {
        success = fn
      }),
    },
  })
  render(<Timetable data={dataset} />)
  preview()
  fireEvent.click(screen.getByText('使用我的位置'))
  fireEvent.click(screen.getByText('指定遠方位置'))
  act(() =>
    success({
      coords: { latitude: 23.1, longitude: 120.3, accuracy: 20 },
    } as GeolocationPosition),
  )
  expect(screen.getByText('0 個地圖站點')).toBeTruthy()
})
it('returns to the current Taiwan time and restores the one-hour window', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-19T10:30:00Z'))
  render(<Timetable data={dataset} />)
  preview()
  fireEvent.change(screen.getByLabelText('時間範圍'), {
    target: { value: '15' },
  })
  fireEvent.click(screen.getByText('回到現在 ±1 小時'))
  expect((screen.getByLabelText('中心時間') as HTMLInputElement).value).toBe(
    '18:30',
  )
  expect((screen.getByLabelText('時間範圍') as HTMLInputElement).value).toBe(
    '60',
  )
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
