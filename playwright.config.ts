import { defineConfig, devices } from '@playwright/test'

/**
 * Responsive/no-overflow harness (UI-kit §7). Heediq is mobile-first: the invariant these specs
 * guard is that no page ever scrolls horizontally, at any supported width, and that primary content
 * fits the viewport. We run the same specs across four representative widths — the smallest phone we
 * support (320), a common phone (375), tablet (768), and desktop (1280) — as separate projects so a
 * regression names the exact breakpoint that broke.
 *
 * The dev server is started for us (reuse an already-running one locally). Only backend-free routes
 * are exercised here (`/` login and the DEV-only `/dev/ui` gallery); authed pages are covered by the
 * component/unit layer, which mocks the API. Run with `pnpm test:responsive`.
 */
const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // The mocked-backend flow tier (D-155) lives in e2e/flows and runs under playwright.flows.config.ts
  // with its own VITE_E2E webServer — keep it out of this responsive-only harness.
  testIgnore: '**/flows/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-320', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 } } },
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } } },
    { name: 'tablet-768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'pnpm dev --port ' + PORT,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
