import { test as base, expect } from '@playwright/test'
import { ApiMock } from './api'
import { installAnalyticsCapture, type AnalyticsCapture } from './amplitude'
import { installFakeWebSocket } from './ws'
import { plantSession, type Persona } from './auth'

/**
 * The mocked-backend flow harness (D-155). Every flow imports `test`/`expect` from here and gets, on
 * the `page` fixture, an already-authenticated session (persona-selectable via `test.use({ persona })`),
 * a fake WebSocket (`emitWs` from `./ws`), a REST mock (`api`), and analytics capture (`analytics`) —
 * all installed before the test navigates. No AWS, no Cognito, fully deterministic → runs in CI on PR.
 */
export interface FlowFixtures {
  persona: Persona
  api: ApiMock
  analytics: AnalyticsCapture
}

export const test = base.extend<FlowFixtures>({
  persona: ['admin', { option: true }],

  // Install initscripts (WS + planted session) before the app boots. Depends on `persona` so the
  // synthetic JWT carries the right claims.
  page: async ({ page, persona }, use) => {
    await installFakeWebSocket(page)
    await plantSession(page, persona)
    await use(page)
  },

  api: async ({ page }, use) => {
    const api = new ApiMock(page)
    await api.install()
    await use(api)
  },

  analytics: async ({ page }, use) => {
    const analytics = await installAnalyticsCapture(page)
    await use(analytics)
  },
}, )

export { expect }
export { emitWs } from './ws'
