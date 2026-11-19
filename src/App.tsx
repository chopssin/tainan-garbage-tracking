import { useEffect, useMemo, useRef, useState } from 'react'
import RouteMap from './RouteMap'
import {
  countdown,
  dayNames,
  formatTime,
  getSchedule,
  statusLabels,
  taipeiNow,
  validDate,
  weekday,
} from './schedule'
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

export function Timetable({ data }: { data: Dataset }) {
  const [routeId, setRouteId] = useState(
    () =>
      data.routes.find(
        (r) => r.district === '山上區' && r.sourceRouteId === '18',
      )?.id ?? data.routes[0]!.id,
  )
  const route = data.routes.find((r) => r.id === routeId) ?? data.routes[0]!
  const [clock, setClock] = useState(taipeiNow)
  const [live, setLive] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const schedule = useMemo(() => getSchedule(route, clock), [route, clock])
  const { next, now, activeCount, passed, unknownCount } = schedule
  const { metadata } = data
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => setClock(taipeiNow()), 1000)
    return () => clearInterval(timer)
  }, [live])
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(
      () =>
        setClock((v) => ({ ...v, seconds: Math.min(86399, v.seconds + 120) })),
      1000,
    )
    return () => clearInterval(timer)
  }, [playing])
  useEffect(() => {
    if (clock.seconds === 86399) setPlaying(false)
  }, [clock.seconds])
  function chooseRoute(id: string) {
    setRouteId(id)
    setSelectedId(null)
    setPlaying(false)
  }
  function preview(seconds: number) {
    setLive(false)
    setPlaying(false)
    setClock((v) => ({ ...v, seconds }))
  }
  function play() {
    if (playing) {
      setPlaying(false)
      return
    }
    const times = schedule.stops
      .filter((s) => s.active && s.seconds !== null)
      .map((s) => s.seconds!)
    if (times.length && (clock.seconds < Math.min(...times) - 300 || !next))
      setClock((v) => ({
        ...v,
        seconds: Math.max(0, Math.min(...times) - 300),
      }))
    else if (clock.seconds >= 86399) setClock((v) => ({ ...v, seconds: 0 }))
    setLive(false)
    setPlaying(true)
  }
  const nextTitle =
    next?.name ??
    (unknownCount
      ? '部分站點班表待確認'
      : activeCount
        ? '今天的時刻表已走完'
        : '今天沒有垃圾收運班次')
  const missingCoordinates = route.stops.filter(
    (s) => s.lat === null || s.lng === null,
  ).length
  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="倒垃圾了首頁"
        >
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path d="M3 9h16v14H3zM19 14h6l4 5v4H19z" />
              <path d="M22 15v4h6M7 13h8m-8 4h6" />
              <circle cx="9" cy="24" r="3" />
              <circle cx="23" cy="24" r="3" />
            </svg>
          </span>
          倒垃圾了<span className="brand-dot">.</span>
        </a>
        <div className="topmeta">
          <span className="city-label">TAINAN</span>
          <span className="mode-pill">班表估算 · 非即時 GPS</span>
          <button
            className="info-button"
            onClick={() => dialog.current?.showModal()}
            aria-label="資料來源與使用說明"
          >
            ?
          </button>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">台南清運時刻地圖</p>
            <h1>今晚，在哪一站？</h1>
            <p>選一條路線，讓倒垃圾剛剛好。</p>
          </div>
          <div className="coverage-summary">
            <strong>
              {metadata.routeCount}
              <span> 條路線</span>
            </strong>
            <p>
              {metadata.districtCount} 區 ·{' '}
              {metadata.stopCount.toLocaleString('zh-TW')} 筆站點班表
            </p>
          </div>
        </section>
        <div className="app-layout">
          <aside className="sidebar">
            <section className="picker panel" aria-labelledby="choose-title">
              <h2 id="choose-title">選擇清運路線</h2>
              <div className="select-grid">
                <label>
                  行政區
                  <select
                    value={route.district}
                    onChange={(e) =>
                      chooseRoute(
                        data.routes.find((r) => r.district === e.target.value)!
                          .id,
                      )
                    }
                  >
                    {metadata.districts.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label>
                  清運路線
                  <select
                    value={route.id}
                    onChange={(e) => chooseRoute(e.target.value)}
                  >
                    {data.routes
                      .filter((r) => r.district === route.district)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.sourceRouteId} 號路線 · {r.stops.length} 站
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <p className="route-caption">
                {route.stops[0]?.name} <span>至</span>{' '}
                {route.stops.at(-1)?.name}
              </p>
              <p className="coverage-note">
                {metadata.missingDistricts.length
                  ? `${metadata.missingDistricts.join('、')}未列於本次官方資料`
                  : '已列出本次官方資料的所有行政區'}
                。
              </p>
            </section>
            <section className="focus-card" aria-labelledby="focus-title">
              <p className="focus-label">
                <span className={next ? 'pulse-dot' : ''} />
                {next
                  ? now
                    ? '當前表定分鐘'
                    : '下一個預定站點'
                  : '當日班表狀態'}
                {next && (
                  <span className="focus-order">第 {next.order} 站</span>
                )}
              </p>
              <h2 id="focus-title">{nextTitle}</h2>
              <p className="focus-detail">
                {next
                  ? `${next.village} · 表定 ${next.time}`
                  : '可選擇其他日期，或用時間軸預覽班表。'}
              </p>
              {schedule.simultaneous > 1 && (
                <p className="focus-detail">
                  另有 {schedule.simultaneous - 1} 站列於相同表定分鐘
                </p>
              )}
              <div className="focus-bottom">
                <div>
                  <span>
                    {next ? (now ? '依時刻表' : '距表定時間') : '時刻表模式'}
                  </span>
                  <strong className="countdown">
                    {next
                      ? now
                        ? '表定現在'
                        : countdown(next.seconds! - clock.seconds)
                      : '—'}
                  </strong>
                </div>
                <button
                  disabled={!next || next.lat === null || next.lng === null}
                  onClick={() => next && setSelectedId(next.id)}
                >
                  查看站點
                </button>
              </div>
              <p className="estimate-note">
                不是車輛到站確認，實際時間可能不同。
              </p>
            </section>
            <section
              className="stops-panel panel"
              aria-labelledby="stops-title"
            >
              <div className="stop-heading">
                <div>
                  <h2 id="stops-title">沿途清運站點</h2>
                  <p>
                    {passed} / {activeCount} 站表定時間已過
                  </p>
                </div>
                <button
                  className="text-button"
                  aria-expanded={!collapsed}
                  aria-controls="stop-list"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? '展開' : '收合'}
                </button>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${activeCount ? (passed / activeCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <ol
                id="stop-list"
                className="stop-list"
                hidden={collapsed}
                aria-label="依清運順序排列的站點"
              >
                {schedule.stops.map((stop, index) => (
                  <li
                    key={stop.id}
                    className={`${schedule.states[index]} ${selectedId === stop.id ? 'is-selected' : ''}`}
                  >
                    <button
                      onClick={() => setSelectedId(stop.id)}
                      aria-pressed={selectedId === stop.id}
                      aria-label={`第 ${stop.order ?? index + 1} 站 ${stop.name}，${stop.time ?? '時間未知'}，${statusLabels[schedule.states[index]!]}`}
                    >
                      <span className="stop-number">{stop.order ?? '?'}</span>
                      <span className="stop-main">
                        <strong>{stop.name || '未提供站名'}</strong>
                        <small>
                          {stop.village} ·{' '}
                          {stop.active === null
                            ? '收運日待確認'
                            : stop.active
                              ? stop.recycling
                                ? '垃圾、回收日'
                                : '垃圾收運日'
                              : stop.recycling
                                ? '今日僅列回收日'
                                : '今日無垃圾收運'}
                        </small>
                      </span>
                      <time>{stop.time ?? '未知'}</time>
                    </button>
                    {selectedId === stop.id && (
                      <div className="stop-extra">
                        <span>{statusLabels[schedule.states[index]!]}</span>
                        <p>
                          垃圾：週{stop.rawDays || '未知'}
                          <br />
                          回收：{stop.rawRecyclingDays || '未知'}
                          {stop.lat === null && (
                            <>
                              <br />
                              此站未提供有效地圖座標
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </aside>
          <section className="map-panel panel" aria-label="互動地圖與時間預覽">
            <RouteMap
              route={route}
              states={schedule.states}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <div className="time-panel">
              <div className="time-heading">
                <h2>探索清運時間</h2>
                <span className={`time-badge ${live ? '' : 'preview'}`}>
                  {live ? '目前時間' : playing ? '播放中 · 120×' : '時間預覽'}
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    setLive(true)
                    setPlaying(false)
                    setClock(taipeiNow())
                  }}
                >
                  回到現在
                </button>
              </div>
              <div className="time-inputs">
                <label>
                  清運日期
                  <input
                    type="date"
                    onFocus={() => {
                      setLive(false)
                      setPlaying(false)
                    }}
                    value={clock.date}
                    onChange={(e) => {
                      if (validDate(e.target.value)) {
                        setLive(false)
                        setPlaying(false)
                        setClock({ ...clock, date: e.target.value })
                      }
                    }}
                  />
                </label>
                <span className="day-status">
                  週{dayNames[weekday(clock.date)]} ·{' '}
                  {unknownCount
                    ? '部分班表待確認'
                    : activeCount
                      ? '有垃圾收運'
                      : '無垃圾收運'}
                </span>
                <label>
                  台灣時間
                  <input
                    type="time"
                    onFocus={() => {
                      setLive(false)
                      setPlaying(false)
                    }}
                    step="1"
                    value={formatTime(clock.seconds, true)}
                    onChange={(e) => {
                      const p = e.target.value.split(':').map(Number)
                      if (p.length >= 2)
                        preview(p[0]! * 3600 + p[1]! * 60 + (p[2] ?? 0))
                    }}
                  />
                </label>
              </div>
              <div className="slider-row">
                <button
                  className="play-button"
                  aria-label={playing ? '暫停時間預覽' : '播放時間預覽'}
                  onClick={play}
                >
                  {playing ? 'Ⅱ' : '▶'}
                </button>
                <div className="range-wrap">
                  <input
                    type="range"
                    aria-label="預覽清運時間"
                    min="0"
                    max="86399"
                    step="1"
                    value={clock.seconds}
                    onChange={(e) => preview(Number(e.target.value))}
                  />
                  <div className="range-labels">
                    <span>00:00</span>
                    <span>拖曳預覽當日班表</span>
                    <span>23:59</span>
                  </div>
                </div>
              </div>
              {route.issues.includes('time-before-previous-stop') && (
                <p className="data-warning" role="note">
                  此路線部分時刻與站序不一致。依各站當日表定時間顯示，不推估跨日行程。
                </p>
              )}
              {missingCoordinates > 0 && (
                <p className="data-warning">
                  {missingCoordinates}{' '}
                  站缺少座標，保留於清單；地圖不跨接缺失站點。
                </p>
              )}
              {unknownCount > 0 && (
                <p className="data-warning">
                  {unknownCount} 站班表不完整，不提供倒數。
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
      <footer>
        <p>常態時刻表快照 · 假日、停駛與臨時異動請以清潔隊公告為準。</p>
        <button
          className="text-button"
          onClick={() => dialog.current?.showModal()}
        >
          資料來源與涵蓋範圍
        </button>
      </footer>
      <dialog ref={dialog} className="about-dialog">
        <form method="dialog">
          <button className="close-button" aria-label="關閉說明">
            ×
          </button>
        </form>
        <p className="eyebrow">關於這張地圖</p>
        <h2>時間知道，車子還不一定。</h2>
        <p>
          這裡依官方班表推估站點狀態，沒有接收垃圾車
          GPS。表定已過不代表已清運；「表定現在」只表示該分鐘，不推測停留時間。
        </p>
        <dl>
          <dt>本次資料涵蓋</dt>
          <dd>
            {metadata.districtCount}/{metadata.expectedDistrictCount} 區、
            {metadata.routeCount} 條路線、
            {metadata.stopCount.toLocaleString('zh-TW')}{' '}
            筆站點班表。這是路線造訪紀錄，不是唯一地點數。缺少：
            {metadata.missingDistricts.join('、') || '無'}。
          </dd>
          <dt>資料時間</dt>
          <dd>
            下載：{taipeiNow(new Date(metadata.retrievedAt)).date}
            。官方資源標示更新：{metadata.resourceUpdatedAt}
            。下載日期不表示每站時刻已重新確認；資料不定期更新，本頁不自動更新班表。
          </dd>
          <dt>需留意的資料</dt>
          <dd>
            {metadata.issues['time-before-previous-stop'] ?? 0}{' '}
            處站序時間倒退，保留原值並標示。
            {metadata.issues['recycling-days-outside-collection-days'] ??
              0}{' '}
            筆回收日超出垃圾收運日，分開呈現；垃圾倒數不套用回收日。
          </dd>
          <dt>尚未提供的資訊</dt>
          <dd>
            即時位置、實際到站、停留時間、假日例外、道路軌跡、跨日班次標記及各站更新日期。箭頭只連接官方站序；跨午夜時改用新日期班表，不自行延續前一天班次。
          </dd>
        </dl>
        <p>
          <a
            href={metadata.catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            臺南市政府環境保護局開放資料
          </a>
        </p>
        <p>
          <a
            href={metadata.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            政府資料開放授權條款第 1 版
          </a>
        </p>
        <p className="muted">
          底圖 © OpenStreetMap contributors。底圖離線時，清單與班表仍可使用。
        </p>
      </dialog>
    </>
  )
}
