import { useEffect, useState } from 'react'

export type Language = 'zh' | 'en'
export const englishDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const english: Record<string, string> = {
  '台南倒垃圾！': 'Tainan Trash',
  '時刻表暫時無法載入，請稍後再試。':
    'The timetable is unavailable. Please try again.',
  '正在讀取台南清運時刻表…': 'Loading Tainan collection schedules…',
  重新載入: 'Retry',
  '此瀏覽器不支援定位，請拖曳地圖選擇區域。':
    'Location is not supported. Drag the map to choose an area.',
  '未允許定位，請拖曳地圖選擇區域。':
    'Location access was denied. Drag the map to choose an area.',
  '暫時無法取得位置，請重試或拖曳地圖。':
    'Location is unavailable. Try again or drag the map.',
  '正在取得位置…': 'Finding your location…',
  拖曳地圖探索附近站點: 'Drag the map to explore nearby stops',
  '台南市中心示範區域 · 拖曳地圖選擇位置':
    'Central Tainan demo area · Drag the map to explore',
  '放大至 2 km² 內可查看所有站點':
    'Zoom in to an area of 2 km² or less to see all stops',
  '空心圓為站點 · 橘色為未來 30 分鐘班表':
    'Hollow circles: stops · Orange: scheduled in the next 30 min',
  日期與時間: 'Date and time',
  '日期（台灣時間）': 'Date (Taiwan time)',
  回到現在: 'Now',
  時間滑桿: 'Time slider',
  目前時間: 'Current time',
  時間預覽: 'Time preview',
  '台灣時間 · 顯示所選時間起 30 分鐘':
    'Taiwan time · Showing 30 minutes from the selected time',
  '班表不是車輛即時位置。假日、停駛與臨時異動請以清潔隊公告為準。連線表示站序，不是行車道路。':
    'Timetable estimates, not live GPS. Check sanitation team notices for holidays, cancellations and changes. Lines show stop order, not driving directions.',
  '定位只在點選按鈕後使用，不會儲存；底圖服務會收到所瀏覽區域的圖磚請求。':
    'Location is used only when requested and is not stored. The map provider receives tile requests for the area you view.',
  資料來源與涵蓋範圍: 'Sources and coverage',
  '官方班表中有站序與時間不一致的路線；保留原始時間，不推估跨日行程。':
    'Some official routes have times that conflict with stop order. Original times are preserved; overnight trips are not inferred.',
  臺南市環保局開放資料: 'Tainan Environmental Protection Bureau open data',
  政府資料開放授權條款: 'Open Government Data License',
  附近清運站點互動地圖: 'Interactive map of nearby collection stops',
  收合完整路線: 'Collapse full route',
  收合: 'Hide',
  放大地圖: 'Zoom in',
  縮小地圖: 'Zoom out',
  使用我的位置: 'Use my location',
  '底圖暫時無法完整載入，仍可點選站點查看班表。':
    'The base map could not fully load. You can still select stops to view schedules.',
  時間未提供: 'Time unavailable',
  '在 Google 地圖開啟': 'Open in Google Maps',
  垃圾: 'Garbage',
  回收: 'Recycling',
}
const translators = {
  zh: (text: string) => text,
  en: (text: string) => english[text] ?? text,
}
export const translator = (language: Language) => translators[language]
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('tainan-language')
      if (saved === 'zh' || saved === 'en') return saved
    } catch {
      /* Fall back to the browser preference when storage is unavailable. */
    }
    const preferred = navigator.languages?.[0] || navigator.language || ''
    return /^zh(?:-|$)/i.test(preferred) ? 'zh' : 'en'
  })
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en'
    document.title = language === 'zh' ? '台南倒垃圾！' : 'Tainan Trash'
    try {
      localStorage.setItem('tainan-language', language)
    } catch {
      /* Storage is optional. */
    }
  }, [language])
  return { language, setLanguage, t: translator(language) }
}
export function collectionDays(
  language: Language,
  raw: string,
  days: number[] | null,
) {
  if (language === 'zh') return raw
  if (days === null) return 'Unknown'
  return days.length ? days.map((day) => englishDays[day]).join(', ') : 'None'
}
