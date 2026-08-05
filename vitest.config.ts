import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Unit/component tests live under src/. Playwright specs (e2e/) run on a real browser via a
    // separate runner — keep vitest from picking them up.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
