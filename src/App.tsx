import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import RouteMap from './RouteMap'
import { formatTime, taipeiNow, validDate } from './schedule'
import { clockTimestamp, nearbyVisits, mapVisits, windowLabel } from './nearby'
import type { Location } from './nearby'
import type { Dataset } from './types'

export default function App() {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError(false)
    fetch(`${import.meta.env.BASE_URL}data/tainan-routes.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Data unavailable')
        return response.json()
      })
      .then((value: Dataset) => {
        if (value.metadata?.schemaVersion !== 1 || !value.routes?.length)
          throw new Error('Invalid dataset')
        setData(value)
      })
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(true)
      })
    return () => controller.abort()
  }, [attempt])
  if (!data)
    return (
      <main className="loading" role="status">
        <h1>
          倒垃圾了<span>.</span>
        </h1>
        <p>
          {error
            ? '時刻表暫時無法載入，請稍後再試。'
            : '正在讀取台南清運時刻表…'}
        </p>
        {error && (
          <button onClick={() => setAttempt(attempt + 1)}>重新載入</button>
        )}
      </main>
    )
  return <Timetable data={data} />
}

const minuteNow = () => {
  const c = taipeiNow()
  return { ...c, seconds: Math.floor(c.seconds / 60) * 60 }
}
export function Timetable({ data }: { data: Dataset }) {
  const [center, setCenter] = useState<Location>({ lat: 22.99, lng: 120.205 })
  const [place, setPlace] = useState('台南市中心示範位置'),
    [radius, setRadius] = useState(500)
  const [clock, setClock] = useState(minuteNow),
    [live, setLive] = useState(true),
    [minutes, setMinutes] = useState(30)
  const [selected, setSelected] = useState<string | null>(null),
    [locating, setLocating] = useState(false),
    [notice, setNotice] = useState('')
  const dialog = useRef<HTMLDialogElement>(null),
    request = useRef(0)
  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => {
      const c = minuteNow()
      setClock((old) =>
        old.date === c.date && old.seconds === c.seconds ? old : c,
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [live])
  useEffect(
    () => () => {
      request.current++
    },
    [],
  )
  const chooseLocation = useCallback((point: Location) => {
    request.current++
    setLocating(false)
    setCenter(point)
    setPlace('地圖指定位置')
    setNotice('')
    setSelected(null)
  }, [])
  function locate() {
    if (!navigator.geolocation) {
      setNotice('此瀏覽器不支援定位，請點選地圖指定位置。')
      return
    }
    const id = ++request.current
    setLocating(true)
    setNotice('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (id !== request.current) return
        setLocating(false)
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setPlace(
          `我的位置（精確度約 ${Math.round(position.coords.accuracy)} 公尺）`,
        )
        setSelected(null)
      },
      (error) => {
        if (id !== request.current) return
        setLocating(false)
        setNotice(
          error.code === 1
            ? '未允許定位。請點選地圖指定位置。'
            : '暫時無法取得位置。請重試或點選地圖。',
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }
  const visits = useMemo(
    () => nearbyVisits(data, center, radius, clock, minutes),
    [data, center, radius, clock, minutes],
  )
  const timestamp = clockTimestamp(clock),
    routeCount = new Set(visits.map((v) => v.route.id)).size
  const [expanded, setExpanded] = useState<string | null>(null)
  useEffect(() => {
    setExpanded(null)
    setSelected(null)
  }, [center, radius, clock, minutes])
  const visible = useMemo(
    () => mapVisits(visits, center, clock, expanded),
    [visits, center, clock, expanded],
  )
  const activeSelected = visible.some((v) => v.id === selected)
    ? selected
    : null
  const selectStop = useCallback(
    (id: string) => {
      const visit = visible.find((v) => v.id === id)
      if (visit) {
        setExpanded(visit.route.id)
        setSelected(id)
      }
    },
    [visible],
  )

  const affected = new Set(
    visits
      .filter((v) => v.route.issues.includes('time-before-previous-stop'))
      .map((v) => v.route.id),
  ).size
  return (
    <>
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL}>
          倒垃圾了<span className="brand-dot">.</span>
        </a>
        <div className="topmeta">
          <span className="mode-pill">班表估算 · 非即時 GPS</span>
          <button
            className="info-button"
            aria-label="資料來源與使用說明"
            onClick={() => dialog.current?.showModal()}
          >
            ?
          </button>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">台南附近清運時刻</p>
            <h1>附近的清運時刻</h1>
            <p>選個位置，看看附近的清運班次。</p>
          </div>
          <div className="coverage-summary">
            <strong>
              {visits.length}
              <span> 筆站點</span>
            </strong>
            <p>附近 {routeCount} 條路線符合條件</p>
          </div>
        </section>
        <div className="app-layout nearby-layout">
          <aside className="sidebar">
            <section className="picker panel">
              <h2>你想在哪裡倒垃圾？</h2>
              <button
                className="location-button"
                onClick={locate}
                disabled={locating}
              >
                {locating ? '正在取得位置…' : '使用我的位置'}
              </button>
              <p className="route-caption">{place}</p>
              <p className="coverage-note">
                {center.lat.toFixed(5)}, {center.lng.toFixed(5)} ·
                可點選地圖重新選位
              </p>
              <label>
                搜尋半徑
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                >
                  <option value="500">500 公尺</option>
                  <option value="1000">1 公里</option>
                  <option value="2000">2 公里</option>
                  <option value="5000">5 公里</option>
                </select>
              </label>
              <p className="privacy-note">
                定位需經你允許，不會儲存你的座標；底圖服務會收到所瀏覽區域的圖磚請求。
              </p>
              {notice && (
                <p role="status" className="data-warning">
                  {notice}
                </p>
              )}
            </section>
            <section className="panel time-panel">
              <div className="time-heading">
                <h2>想看什麼時間？</h2>
                <span className="time-badge">
                  {live ? '目前時間' : '時間預覽'}
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    setLive(true)
                    setClock(minuteNow())
                    setMinutes(30)
                  }}
                >
                  回到現在起 30 分鐘
                </button>
              </div>
              <div className="nearby-time-inputs">
                <label>
                  日期（台灣時間）
                  <input
                    type="date"
                    value={clock.date}
                    onFocus={() => setLive(false)}
                    onChange={(e) => {
                      if (validDate(e.target.value)) {
                        setLive(false)
                        setClock({ ...clock, date: e.target.value })
                      }
                    }}
                  />
                </label>
                <label>
                  開始時間
                  <input
                    type="time"
                    step="60"
                    value={formatTime(clock.seconds)}
                    onFocus={() => setLive(false)}
                    onChange={(e) => {
                      if (!e.target.value) return
                      const [h, m] = e.target.value.split(':').map(Number)
                      setLive(false)
                      setClock({ ...clock, seconds: h! * 3600 + m! * 60 })
                    }}
                  />
                </label>
              </div>
              <label className="slider-label">
                拖曳開始時間 · {formatTime(clock.seconds)}
                <input
                  type="range"
                  aria-label="開始時間滑桿"
                  min="0"
                  max="1439"
                  value={clock.seconds / 60}
                  onChange={(e) => {
                    setLive(false)
                    setClock({ ...clock, seconds: Number(e.target.value) * 60 })
                  }}
                />
              </label>
              <label className="slider-label">
                接下來 {minutes} 分鐘
                <input
                  type="range"
                  aria-label="時間範圍"
                  min="15"
                  max="180"
                  step="15"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </label>
              <p className="window-summary">
                {windowLabel(timestamp)} —{' '}
                {windowLabel(timestamp + minutes * 60000)}
              </p>
              <p className="coverage-note">跨午夜時，依各日期的收運日篩選。</p>
            </section>
          </aside>
          <section className="map-panel panel" aria-label="附近清運地圖">
            <RouteMap
              center={center}
              radius={radius}
              visits={visible}
              selectedId={activeSelected}
              onSelect={selectStop}
              expanded={expanded !== null}
              onCollapse={() => {
                setExpanded(null)
                setSelected(null)
              }}
              onLocation={chooseLocation}
            />
            <div className="map-summary" role="status">
              {visits.length
                ? `找到 ${visits.length} 筆站點班表 · ${routeCount} 條路線`
                : '此範圍與時段沒有符合的垃圾收運站點。'}
              <p>
                每條未展開路線只顯示一個目前／下一站（閃爍）、前一站（灰色）與後一站（淺橘）。前後站可能不在範圍或時段內；點站點可展開整條路線。
              </p>
              {!visits.length && (
                <p>
                  試著擴大半徑、改變時間，或在地圖選擇其他位置；沒有結果不代表實際無服務。
                </p>
              )}
              {affected > 0 && (
                <p className="data-warning">
                  其中 {affected}{' '}
                  條路線的官方時間與站序不一致，保留表定時間，不推估跨日行程。
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
      <footer>
        <p>班表不是車輛即時位置。假日、停駛與臨時異動請以清潔隊公告為準。</p>
        <button
          className="text-button"
          onClick={() => dialog.current?.showModal()}
        >
          資料來源與涵蓋範圍
        </button>
      </footer>
      <dialog
        ref={dialog}
        className="about-dialog"
        aria-labelledby="about-title"
      >
        <form method="dialog">
          <button className="close-button" aria-label="關閉說明">
            ×
          </button>
        </form>
        <h2 id="about-title">看的是班表，不是即時車輛。</h2>
        <p>
          依搜尋位置、半徑與開始時間後的時段篩選官方垃圾收運站點。橘色是各條符合路線在範圍內的當前／下一個表定站點，不代表有車正在現場。前後站為路線參考，不表示當日有收運；展開路線中的空心點不符合搜尋條件。連線只連接相鄰的可見站點，不是行車道路。
        </p>
        <p>
          涵蓋 {data.metadata.districtCount}/
          {data.metadata.expectedDistrictCount} 區、{data.metadata.routeCount}{' '}
          條路線、{data.metadata.stopCount.toLocaleString()} 筆班表。缺少：
          {data.metadata.missingDistricts.join('、') || '無'}
          。缺少座標、時間或收運日的資料不納入附近結果。
        </p>
        <p>
          官方資源更新：{data.metadata.resourceUpdatedAt}；下載：
          {taipeiNow(new Date(data.metadata.retrievedAt)).date}。無即時
          GPS、假日例外、停駛資訊、各站修訂日期或跨日班次標記。回收日與垃圾日分開，不用回收日產生垃圾班次。
        </p>
        <p>
          <a href={data.metadata.catalogUrl} target="_blank" rel="noreferrer">
            臺南市環保局資料來源
          </a>{' '}
          ·{' '}
          <a href={data.metadata.licenseUrl} target="_blank" rel="noreferrer">
            政府資料開放授權條款
          </a>
        </p>
      </dialog>
    </>
  )
}
