import { seoHtml } from './scripts/seo-html.ts'
import seo from './src/seo-content.json' with { type: 'json' }
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'static-seo',
      transformIndexHtml: seoHtml,
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${seo.url}</loc></url></urlset>`,
        })
      },
    },
  ],
  // GitHub's configure-pages action supplies /repo/ or / for a root/custom domain.
  base: process.env.BASE_PATH || '/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    clearMocks: true,
  },
})
