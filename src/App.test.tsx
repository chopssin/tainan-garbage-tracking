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
  fireEvent.change(screen.getByLabelText('開始時間'), {
    target: { value: '18:00' },
  })
  fireEvent.click(screen.getByText('指定測試位置'))
}
it('defaults to 500m and 30 minutes, removes the list and clears distant results', () => {
  render(<Timetable data={dataset} />)
  expect((screen.getByLabelText('搜尋半徑') as HTMLSelectElement).value).toBe(
    '500',
  )
  expect((screen.getByLabelText('時間範圍') as HTMLInputElement).value).toBe(
    '30',
  )
  preview()
  expect(screen.queryByLabelText('清運路線')).toBeNull()
  expect(screen.queryByText('這段時間的附近站點')).toBeNull()
  expect(screen.getByText('2 個地圖站點')).toBeTruthy()
  fireEvent.click(screen.getByText('指定遠方位置'))
  expect(screen.getByText('0 個地圖站點')).toBeTruthy()
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
it('returns to the current Taiwan time and restores the forward 30-minute window', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-19T10:30:00Z'))
  render(<Timetable data={dataset} />)
  preview()
  fireEvent.change(screen.getByLabelText('時間範圍'), {
    target: { value: '15' },
  })
  fireEvent.click(screen.getByText('回到現在起 30 分鐘'))
  expect((screen.getByLabelText('開始時間') as HTMLInputElement).value).toBe(
    '18:30',
  )
  expect((screen.getByLabelText('時間範圍') as HTMLInputElement).value).toBe(
    '30',
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
