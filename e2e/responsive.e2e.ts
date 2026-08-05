import { test, expect, type Page } from '@playwright/test'

/**
 * The mobile-first invariant (UI-kit §7): the page must never scroll horizontally, and no element
 * may spill past the viewport edge. `scrollWidth <= clientWidth` (allowing 1px for sub-pixel
 * rounding) is the objective check — it catches a fixed-width child, an unwrapped table, or a long
 * unbroken string that a screenshot review would miss. We assert it on every backend-free route,
 * across the viewport projects defined in playwright.config.ts.
 */

// Backend-free routes only — see playwright.config.ts. `/dev/ui` is DEV-only (vite dev serves it).
const ROUTES: { path: string; name: string }[] = [
  { path: '/', name: 'home-login' },
  { path: '/dev/ui', name: 'ui-gallery' },
]

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  // 1px tolerance for sub-pixel layout rounding.
  expect(scrollWidth, `document scrollWidth (${scrollWidth}) must not exceed viewport (${clientWidth})`).toBeLessThanOrEqual(
    clientWidth + 1,
  )
}

for (const route of ROUTES) {
  test.describe(route.name, () => {
    test('does not scroll horizontally and fits the viewport', async ({ page }, testInfo) => {
      await page.goto(route.path, { waitUntil: 'networkidle' })
      await expectNoHorizontalOverflow(page)

      // Visual snapshot for review (not asserted pixel-perfect — attached to the report).
      await testInfo.attach(`${route.name}-${testInfo.project.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
    })
  })
}
