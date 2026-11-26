import content from '../src/seo-content.json' with { type: 'json' }
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  )
export function seoHtml(html: string) {
  const { url, image, zh } = content
  const head = `<title>${escape(zh.title)}</title>
    <meta name="description" content="${escape(zh.description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="台南倒垃圾！ · Tainan Trash" />
    <meta property="og:title" content="${escape(zh.title)}" />
    <meta property="og:description" content="${escape(zh.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:image" content="${url}${image}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="台南倒垃圾！ Tainan Trash — timetable map, not live GPS" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(zh.title)}" />
    <meta name="twitter:description" content="${escape(zh.description)}" />
    <meta name="twitter:image" content="${url}${image}" />`
  const guide = `<section class="site-guide" aria-label="使用說明 / Guide">${(
    ['zh', 'en'] as const
  )
    .map((language) => {
      const text = content[language]
      return `<article data-seo-language="${language}" lang="${language === 'zh' ? 'zh-Hant' : 'en'}">
      <h2>${escape(text.heading)}</h2><p>${escape(text.intro)}</p>
      <details><summary>${escape(text.faqTitle)}</summary>${text.faq.map(([question, answer]) => `<h3>${escape(question!)}</h3><p>${escape(answer!)}</p>`).join('')}</details>
      <p><a href="https://clean.tnepb.gov.tw/" target="_blank" rel="noopener noreferrer">${escape(text.referenceLabel)}</a></p>
    </article>`
    })
    .join('')}</section>`
  return html
    .replace('<!-- SEO_HEAD -->', head)
    .replace('<!-- SEO_GUIDE -->', guide)
}
