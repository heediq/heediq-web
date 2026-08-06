import { test, expect } from '../support/test'
import { meResponse } from '../fixtures/me'
import { ACCOUNT, ORG_ID } from '../support/ids'

/**
 * Login / identity journey (D-155 Tier 1). Proves the whole mocked-backend harness: the VITE_E2E
 * seam bootstraps an authenticated session, the app lands on the authed home, and — the D-154 join
 * keys — every emitted analytics event carries `user_id = accountId` and the `org` group = `orgId`.
 */
test.describe('login / identity', () => {
  test('bootstraps an authenticated session and attributes events to the identified user', async ({ page, api, analytics }) => {
    api.on('GET', '/me', meResponse('admin'))
    api.on('GET', '/contexts/tree', { tree: [] })

    // Authenticated → HomePage redirects to /capture (the authed home).
    await page.goto('/')
    await expect(page).toHaveURL(/\/capture$/)

    // The org group is established at identify time (D-154 org rollup)…
    await analytics.waitForGroup('org', ORG_ID)

    // …and every real interaction event is attributed to the identified user (the cross-service join key).
    await page.getByRole('link', { name: 'Contexts' }).click()
    const nav = await analytics.waitForEvent('nav_item_clicked', { item: 'contexts', surface: 'top' })
    expect(nav.user_id).toBe(ACCOUNT.admin)
  })
})
