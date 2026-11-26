import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
const seo = JSON.parse(readFileSync(new URL('../src/seo-content.json', import.meta.url)))
const output = new URL('../dist/', import.meta.url)
const html = readFileSync(new URL('index.html', output), 'utf8')
assert(html.includes(`<link rel="canonical" href="${seo.url}"`))
assert(html.includes(seo.zh.title))
assert(!html.includes('<!-- SEO_'))
assert(!/<meta[^>]+(?:name="robots"|name="googlebot")[^>]+noindex/i.test(html))
assert(!/hreflang=/.test(html), 'One URL must not advertise duplicate language URLs')
for (const lang of ['zh', 'en']) {
  assert(html.includes(seo[lang].intro), `Missing initial HTML introduction: ${lang}`)
  for (const [question, answer] of seo[lang].faq) {
    assert(html.includes(question) && html.includes(answer), `Missing initial HTML FAQ: ${question}`)
  }
}
assert(html.includes(`${seo.url}${seo.image}`))
const png = readFileSync(new URL(seo.image, output))
assert.equal(png.readUInt32BE(16), 1200)
assert.equal(png.readUInt32BE(20), 630)
assert(statSync(new URL('favicon.png', output)).size > 0)
const sitemap = readFileSync(new URL('sitemap.xml', output), 'utf8')
assert(sitemap.includes(`<loc>${seo.url}</loc>`))
assert.equal((sitemap.match(/<loc>/g) || []).length, 1)
console.log('Verified initial bilingual HTML, canonical URL, sitemap, sharing metadata, 1200×630 preview and favicon.')
