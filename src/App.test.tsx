import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App, { Timetable } from './App'
import { dataset } from './test/fixtures'
import type { Route } from './types'
vi.mock('./RouteMap', () => ({
  default: ({ route }: { route: Route }) => (
    <div aria-label="測試地圖">{route.name}</div>
  ),
}))
afterEach(() => vi.unstubAllGlobals())

it('changes district and route, previews Taiwan dates/times, and returns to the current clock', async () => {
  const user = userEvent.setup()
  render(<Timetable data={dataset} />)
  expect(screen.getByText('班表估算 · 非即時 GPS')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('清運日期'), {
    target: { value: '2026-11-19' },
  })
  fireEvent.change(screen.getByLabelText('台灣時間'), {
    target: { value: '17:59:00' },
  })
  expect(screen.getByText('01:00')).toBeTruthy()
  await user.selectOptions(screen.getByLabelText('行政區'), '新市區')
  expect((screen.getByLabelText('清運路線') as HTMLSelectElement).value).toBe(
    '新市區:266',
  )
  expect(screen.getByLabelText('測試地圖').textContent).toBe(
    '新市區 · 路線 266',
  )
  fireEvent.change(screen.getByLabelText('清運日期'), {
    target: { value: '2026-11-22' },
  })
  expect(screen.getByText('今天沒有垃圾收運班次')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '回到現在' }))
  expect(screen.getByText('目前時間')).toBeTruthy()
})

it('selects a stop with the keyboard and collapses the stop list', async () => {
  const user = userEvent.setup()
  render(<Timetable data={dataset} />)
  const stop = screen.getByRole('button', { name: /第 1 站 測試站 1/ })
  stop.focus()
  await user.keyboard('{Enter}')
  expect(stop.getAttribute('aria-pressed')).toBe('true')
  await user.click(screen.getByRole('button', { name: '收合' }))
  expect(
    screen.queryByRole('list', { name: '依清運順序排列的站點' }),
  ).toBeNull()
  await user.click(screen.getByRole('button', { name: '展開' }))
  expect(
    screen.getByRole('list', { name: '依清運順序排列的站點' }),
  ).toBeTruthy()
})

it('offers recovery when the dataset fails to load', async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue({ ok: true, json: async () => dataset })
  vi.stubGlobal('fetch', fetchMock)
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: '重新載入' }))
  await waitFor(() => expect(screen.getByLabelText('行政區')).toBeTruthy())
  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    `${import.meta.env.BASE_URL}data/tainan-routes.json`,
  )
})

it('pauses the live clock while editing and advances playback without crossing midnight', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-19T10:00:00Z'))
  try {
    render(<Timetable data={dataset} />)
    const time = screen.getByLabelText('台灣時間') as HTMLInputElement
    fireEvent.focus(time)
    expect(screen.getByText('時間預覽')).toBeTruthy()
    act(() => vi.advanceTimersByTime(2000))
    expect(time.value).toBe('18:00:00')
    fireEvent.click(screen.getByRole('button', { name: '播放時間預覽' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(time.value).toBe('18:02:00')
    act(() => vi.advanceTimersByTime(180000))
    expect(time.value).toBe('23:59:59')
    expect((screen.getByLabelText('清運日期') as HTMLInputElement).value).toBe(
      '2026-11-19',
    )
    expect(screen.getByRole('button', { name: '播放時間預覽' })).toBeTruthy()
  } finally {
    vi.useRealTimers()
  }
})
