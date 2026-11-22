import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useLanguage } from './language'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

it.each([
  ['zh-TW', 'zh'],
  ['zh-CN', 'zh'],
  ['zh-Hant', 'zh'],
  ['ZH-hk', 'zh'],
  ['zh', 'zh'],
  ['en-US', 'en'],
  ['ja-JP', 'en'],
  ['fr-FR', 'en'],
])(
  'chooses the first preferred browser language: %s',
  (preferred, expected) => {
    vi.stubGlobal('navigator', {
      languages: [preferred, 'zh-TW'],
      language: preferred,
    })
    const { result } = renderHook(useLanguage)
    expect(result.current.language).toBe(expected)
  },
)

it.each(['zh', 'en'])(
  'prioritizes a saved %s choice over the browser',
  (saved) => {
    localStorage.setItem('tainan-language', saved)
    vi.stubGlobal('navigator', {
      languages: [saved === 'zh' ? 'en-US' : 'zh-TW'],
    })
    const { result } = renderHook(useLanguage)
    expect(result.current.language).toBe(saved)
  },
)

it('ignores invalid saved choices and falls back to navigator.language', () => {
  localStorage.setItem('tainan-language', 'invalid')
  vi.stubGlobal('navigator', { languages: [], language: 'zh-TW' })
  expect(renderHook(useLanguage).result.current.language).toBe('zh')
})

it('works without storage and allows manual switching', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  vi.stubGlobal('navigator', { language: 'ja-JP' })
  const { result } = renderHook(useLanguage)
  expect(result.current.language).toBe('en')
  act(() => result.current.setLanguage('zh'))
  expect(result.current.language).toBe('zh')
  expect(document.documentElement.lang).toBe('zh-Hant')
})
