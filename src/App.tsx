import { useLanguage, englishDays } from './language'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import RouteMap from './RouteMap'
import { formatTime, taipeiNow, validDate, weekday, dayNames } from './schedule'
import { areaKm2, defaultBounds, viewportStops } from './viewport'
import type { Bounds } from './viewport'
import type { Location } from './nearby'
import type { Dataset } from './types'

export default function App() {
  const { t } = useLanguage()
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
        <h1>{t('台南倒垃圾！')}</h1>
        <p>
          {error
            ? t('時刻表暫時無法載入，請稍後再試。')
            : t('正在讀取台南清運時刻表…')}
        </p>
        {error && (
          <button onClick={() => setAttempt(attempt + 1)}>
            {t('重新載入')}
          </button>
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
  const { language, setLanguage, t } = useLanguage()
  const [clock, setClock] = useState(minuteNow)
  const [live, setLive] = useState(true)
  const [bounds, setBounds] = useState<Bounds>(defaultBounds)
  const [location, setLocation] = useState<Location | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState('')
  const request = useRef(0)
  useEffect(() => {
    if (!live) return
    const timer = setInterval(
      () =>
        setClock((old) => {
          const c = minuteNow()
          return old.date === c.date && old.seconds === c.seconds ? old : c
        }),
      1000,
    )
    return () => clearInterval(timer)
  }, [live])
  useEffect(
    () => () => {
      request.current++
    },
    [],
  )
  const changeBounds = useCallback((b: Bounds) => {
    setBounds(b)
    request.current++
    setLocating(false)
  }, [])
  const stops = useMemo(
    () => viewportStops(data, bounds, clock, selectedRoute),
    [data, bounds, clock, selectedRoute],
  )
  const select = useCallback(
    (id: string) => {
      const stop = stops.find((v) => v.id === id)
      if (stop) {
        setSelected(id)
        setSelectedRoute(stop.route.id)
      }
    },
    [stops],
  )
  const dismiss = useCallback((id: string) => {
    setSelected((current) => (current === id ? null : current))
  }, [])
  const collapse = useCallback(() => {
    setSelected(null)
    setSelectedRoute(null)
  }, [])
  function locate() {
    if (!navigator.geolocation) {
      setNotice('此瀏覽器不支援定位，請拖曳地圖選擇區域。')
      return
    }
    const id = ++request.current
    setLocating(true)
    setNotice('')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (id !== request.current) return
        setLocating(false)
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude })
        collapse()
      },
      (e) => {
        if (id !== request.current) return
        setLocating(false)
        setNotice(
          e.code === 1
            ? '未允許定位，請拖曳地圖選擇區域。'
            : '暫時無法取得位置，請重試或拖曳地圖。',
        )
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
    )
  }
  // Keep real current time accurate outside the usual collection hours too.
  const sliderMin = Math.min(360, Math.floor(clock.seconds / 60))
  const sliderMax = Math.max(1320, Math.floor(clock.seconds / 60))
  const position =
    ((clock.seconds / 60 - sliderMin) / (sliderMax - sliderMin)) * 100
  return (
    <main className="sketch-app">
      <header className="sketch-header">
        <h1>
          <img
            className="header-icon"
            src={`${import.meta.env.BASE_URL}favicon.png`}
            alt=""
            width="36"
            height="36"
          />
          {t('台南倒垃圾！')}
        </h1>
        <div
          className="language-switch"
          role="group"
          aria-label={language === 'zh' ? '語言' : 'Language'}
        >
          <button
            lang="zh-Hant"
            aria-label="中文"
            aria-pressed={language === 'zh'}
            onClick={() => setLanguage('zh')}
          >
            中
          </button>
          <span aria-hidden="true">|</span>
          <button
            lang="en"
            aria-label="English"
            aria-pressed={language === 'en'}
            onClick={() => setLanguage('en')}
          >
            En
          </button>
        </div>
      </header>
      <RouteMap
        language={language}
        visits={stops}
        selectedId={selected}
        expanded={!!selectedRoute}
        onSelect={select}
        onDismiss={dismiss}
        onCollapse={collapse}
        onBounds={changeBounds}
        location={location}
      />
      <div className="map-caption" role="status">
        {(notice && t(notice)) ||
          (locating
            ? t('正在取得位置…')
            : location
              ? t('拖曳地圖探索附近站點')
              : t('台南市中心示範區域 · 拖曳地圖選擇位置'))}
        <span>
          {areaKm2(bounds) > 2
            ? t('放大至 2 km² 內可查看所有站點')
            : t('空心圓為站點 · 橘色為未來 30 分鐘班表')}
        </span>
      </div>
      <section className="time-controls" aria-label={t('日期與時間')}>
        <div className="date-row">
          <label className="date-picker">
            <span>
              {language === 'zh'
                ? `週${dayNames[weekday(clock.date)]}`
                : englishDays[weekday(clock.date)]}
              （{clock.date.slice(5).replace('-', '/')}）
            </span>
            <input
              type="date"
              aria-label={t('日期（台灣時間）')}
              value={clock.date}
              onChange={(e) => {
                if (validDate(e.target.value)) {
                  setLive(false)
                  setClock({ ...clock, date: e.target.value })
                  collapse()
                }
              }}
            />
          </label>
          <div className="date-actions">
            <button
              className="locate-control"
              aria-label={t('使用我的位置')}
              title={t('使用我的位置')}
              onClick={locate}
              disabled={locating}
              aria-busy={locating}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="2" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>
            <button
              className="now-button"
              onClick={() => {
                setLive(true)
                setClock(minuteNow())
                collapse()
              }}
            >
              {t('回到現在')}
            </button>
          </div>
        </div>
        <div className="timeline">
          <div className="time-indicator" style={{ left: `${position}%` }}>
            <output style={{ transform: `translateX(-${position}%)` }}>
              {formatTime(clock.seconds)}
            </output>
          </div>
          <input
            type="range"
            aria-label={t('時間滑桿')}
            aria-valuetext={formatTime(clock.seconds)}
            min={sliderMin}
            max={sliderMax}
            step="1"
            value={clock.seconds / 60}
            onChange={(e) => {
              setLive(false)
              setClock({ ...clock, seconds: Number(e.target.value) * 60 })
            }}
          />
          <div className="time-ticks" aria-hidden="true">
            <span>{formatTime(sliderMin * 60)}</span>
            <span
              style={{
                left: `${((720 - sliderMin) / (sliderMax - sliderMin)) * 100}%`,
              }}
            >
              12:00
            </span>
            <span
              style={{
                left: `${((1080 - sliderMin) / (sliderMax - sliderMin)) * 100}%`,
              }}
            >
              18:00
            </span>
            <span>{formatTime(sliderMax * 60)}</span>
          </div>
        </div>
        <p className="time-caption">
          {live ? t('目前時間') : t('時間預覽')} ·{' '}
          {t('台灣時間 · 顯示所選時間起 30 分鐘')}
        </p>
      </section>
      <footer className="sketch-footer">
        <p>
          {t(
            '班表不是車輛即時位置。假日、停駛與臨時異動請以清潔隊公告為準。連線表示站序，不是行車道路。',
          )}
        </p>
        <p>
          {t(
            '定位只在點選按鈕後使用，不會儲存；底圖服務會收到所瀏覽區域的圖磚請求。',
          )}
        </p>
        <details>
          <summary>{t('資料來源與涵蓋範圍')}</summary>
          <p>
            {language === 'zh'
              ? `涵蓋 ${data.metadata.districtCount}/${data.metadata.expectedDistrictCount} 區、${data.metadata.routeCount} 條路線、${data.metadata.stopCount.toLocaleString()} 筆班表。缺少：${data.metadata.missingDistricts.join('、')}。`
              : `Coverage: ${data.metadata.districtCount}/${data.metadata.expectedDistrictCount} districts, ${data.metadata.routeCount} routes, ${data.metadata.stopCount.toLocaleString('en-US')} scheduled stops. Missing: ${data.metadata.missingDistricts.join(', ')}.`}
          </p>
          <p>
            {language === 'zh'
              ? `官方資源更新：${data.metadata.resourceUpdatedAt}。無即時 GPS、假日例外、停駛資訊。回收日與垃圾日分開；空心站點不表示當日有收運。`
              : `Official resource updated: ${data.metadata.resourceUpdatedAt}. No live GPS, holiday exceptions or cancellation data. Garbage and recycling days are independent; hollow markers do not imply service that day. Official addresses and map place names remain in their source language.`}
          </p>
          <p>
            {t(
              '官方班表中有站序與時間不一致的路線；保留原始時間，不推估跨日行程。',
            )}
          </p>
          <a href={data.metadata.catalogUrl} target="_blank" rel="noreferrer">
            {t('臺南市環保局開放資料')}
          </a>{' '}
          ·{' '}
          <a href={data.metadata.licenseUrl} target="_blank" rel="noreferrer">
            {t('政府資料開放授權條款')}
          </a>
        </details>
      </footer>
    </main>
  )
}
