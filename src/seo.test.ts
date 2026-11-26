import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { seoHtml } from '../scripts/seo-html'
import seo from './seo-content.json'
import { useLanguage } from './language'

afterEach(() => {
  localStorage.clear()
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})
it('switches SEO content and metadata while keeping one canonical URL', () => {
  const doc = new DOMParser().parseFromString(
    seoHtml(
      '<html><head><!-- SEO_HEAD --></head><body><!-- SEO_GUIDE --></body></html>',
    ),
    'text/html',
  )
  document.head.innerHTML = doc.head.innerHTML
  document.body.innerHTML = doc.body.innerHTML
  localStorage.setItem('tainan-language', 'zh')
  const { result } = renderHook(useLanguage)
  expect(document.title).toBe(seo.zh.title)
  act(() => result.current.setLanguage('en'))
  expect(document.title).toBe(seo.en.title)
  expect(
    document.querySelector('meta[name="description"]')?.getAttribute('content'),
  ).toBe(seo.en.description)
  expect(
    document
      .querySelector('meta[property="og:locale"]')
      ?.getAttribute('content'),
  ).toBe('en_US')
  expect(
    (document.querySelector('[data-seo-language="zh"]') as HTMLElement).hidden,
  ).toBe(true)
  expect(
    (document.querySelector('[data-seo-language="en"]') as HTMLElement).hidden,
  ).toBe(false)
  expect(
    document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  ).toBe(seo.url)
  expect(document.querySelector('details')?.open).toBe(false)
})
