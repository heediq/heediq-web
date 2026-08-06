import { test, expect } from '../support/test'
import { meResponse } from '../fixtures/me'

/**
 * RBAC gating + Settings journeys (D-155 Tier 1, ties D-102). The authority for what a user may do is
 * `GET /me.effectivePermissions` — never the JWT. These flows prove the client honours that authority:
 * an admin sees the role/audit affordances and can open the audit log (`audit_log_viewed`), while a
 * member sees neither card and is redirected away from the gated routes by the `<Can>` fallback.
 */
test.describe('settings + RBAC gating', () => {
  test.describe('admin', () => {
    test('sees the admin cards and can open the audit log', async ({ page, api, analytics }) => {
      api.on('GET', '/me', meResponse('admin'))
      api.on('GET', '/auth/methods', { methods: [] })
      api.on('GET', '/org/audit-log', { entries: [], nextCursor: null })

      await page.goto('/settings')
      await analytics.waitForEvent('settings_opened')

      // The role/audit affordances are gated on `org:manage-roles` / `audit:read`, which admin holds.
      await expect(page.getByRole('link', { name: 'Roles & Permissions' })).toBeVisible()
      const auditLink = page.getByRole('link', { name: 'Audit Log' })
      await expect(auditLink).toBeVisible()

      await auditLink.click()
      await expect(page).toHaveURL(/\/org\/audit-log$/)
      await analytics.waitForEvent('audit_log_viewed')
    })
  })

  test.describe('member', () => {
    test.use({ persona: 'member' })

    test('sees no admin cards and is redirected away from gated routes', async ({ page, api, analytics }) => {
      api.on('GET', '/me', meResponse('member'))
      api.on('GET', '/auth/methods', { methods: [] })
      api.on('GET', '/org/audit-log', { entries: [], nextCursor: null })

      await page.goto('/settings')
      await analytics.waitForEvent('settings_opened')

      // Member lacks `org:manage-roles` / `audit:read` → the `<Can>` gate hides both cards.
      await expect(page.getByRole('link', { name: 'Roles & Permissions' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Audit Log' })).toHaveCount(0)

      // Direct navigation to a gated route falls back to /settings (the client authorization boundary).
      await page.goto('/org/audit-log')
      await expect(page).toHaveURL(/\/settings$/)
    })
  })
})
