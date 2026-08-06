import { defineConfig, devices } from '@playwright/test'

/**
 * Tier 1 — mocked-backend flow E2E (D-155). A separate Playwright config from the responsive harness
 * (`playwright.config.ts`, D-153) so the two never share a webServer or matcher. These specs drive
 * every authed user journey with Cognito/REST/WS all mocked (`e2e/support/`), asserting UI outcomes
 * plus the D-154 analytics events fired. Fully deterministic + no AWS → runs in CI on PR.
 *
 * The dev server boots with `VITE_E2E=1` (activates the auth seam, `src/lib/auth/e2e-seam.ts`), a
 * dummy Amplitude key (so the Browser SDK loads and posts batches we route-mock), and fake API/WS
 * base URLs (routed/overridden in-test — never actually reached). A dedicated port keeps it isolated
 * from a normal `pnpm dev`. Run with `pnpm test:e2e`.
 */
const PORT = 5273
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e/flows',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_E2E: '1',
      VITE_AMPLITUDE_API_KEY: 'e2e-dummy-key',
      VITE_API_BASE_URL: 'http://api.e2e.local',
      VITE_WS_BASE_URL: 'ws://ws.e2e.local',
    },
  },
})
