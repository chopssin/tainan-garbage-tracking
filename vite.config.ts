import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // GitHub's configure-pages action supplies /repo/ or / for a root/custom domain.
  base: process.env.BASE_PATH || '/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    clearMocks: true,
  },
})
