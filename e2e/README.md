# `e2e/` — end-to-end tests

Two independent Playwright tiers live here, each with its own config. **They never share a run.**

| Tier | Config | Command | What it proves |
|---|---|---|---|
| Responsive harness | `playwright.config.ts` | `pnpm test:responsive` | No page scrolls horizontally at any supported width (`responsive.e2e.ts`). Backend-free routes only. |
| **Flow tier (D-155 Tier 1)** | `playwright.flows.config.ts` | `pnpm test:e2e` | Whole user journeys against a **mocked backend**, asserting both the UI and the exact D-154 analytics events fired. |

`playwright.config.ts` sets `testIgnore: '**/flows/**'` and the flows config sets `testDir: './e2e/flows'`, so the two never collide. This README is about the **flow tier**.

## Why it exists (D-155)

Tier 1 is the fast, deterministic, offline half of the two-tier E2E strategy. It runs the real React app in a real browser but with **no real services** — auth, the REST API, the WebSocket, and Amplitude are all faked in-browser. That makes it safe to run on every PR (see `.github/workflows/ci.yml`, the `e2e` job) and lets it assert the one thing unit tests can't: that a full journey fires the correct [D-154](../../claude-workspace/memory/business/DECISIONS_FULL.md) analytics taxonomy with the right entity ids.

Real-stack coverage (audio/transcription, live infra) is **Tier 2** — dev-smoke tests, not here.

## Layout

```
e2e/
  flows/*.e2e.ts     one file per user journey (the tests)
  fixtures/          domain objects + GET /me, each parsed through @heediq/shared Zod
  support/           the harness (test fixtures, fakes, id constants)
```

### `support/` — the harness

- **`test.ts`** — the entry point. Extends `@playwright/test` with three fixtures + a `persona` option, and overrides `page` to install the auth + WS fakes before every navigation. **Import `test`/`expect`/`emitWs` from here, never from `@playwright/test` directly.**
  - `persona` (option, default `'admin'`) — which `PERSONAS` identity the run authenticates as. Override per-file/describe with `test.use({ persona: 'member' })`.
  - `api` — the `ApiMock` (see below), pre-installed.
  - `analytics` — the Amplitude capture (see below), pre-installed.
- **`auth.ts`** — the synthetic-JWT auth seam. `plantSession(page, persona)` sets `window.__E2E_SESSION__` via `addInitScript`; the app's production `readE2eSession()` (gated on `import.meta.env.VITE_E2E`, dead-code-eliminated in real builds) picks it up and boots straight to authenticated — no Cognito round trip. `PERSONAS` defines each identity's `accountId`/`orgId`/`role`/`permissions`.
- **`api.ts`** — `ApiMock` route-mocks `**/api/v1/**`. `api.on(method, path, data)` for success (`{ok:true,data}`), `api.onError(method, path, status, error)` for failures. `path` is the string after `/api/v1` (query stripped for matching) or a `RegExp`. Unmatched calls → `404 E2E_UNMOCKED` and are recorded (`api.unmatchedCalls()`).
- **`ws.ts`** — replaces `window.WebSocket` with a fake. `emitWs(page, envelope)` (re-exported from `test.ts`) pushes a server event into the app; build the envelope with `buildWsEvent(...)` from `@heediq/shared` so it's schema-valid.
- **`amplitude.ts`** — route-mocks `*.amplitude.com` (regex, and it also stubs the remote-config GET so nothing leaves the browser), decodes the SDK's gzipped batches, and captures every event.
  - `analytics.waitForEvent(type, props?)` → resolves with the captured event (assert `.user_id` on it — track events carry `user_id`).
  - `analytics.waitForGroup(name, value)` → the `org` group rides on `$identify` events, **not** track events, so assert group membership with this, not `waitForEvent`.
- **`ids.ts`** — the fixed UUIDs every fixture/flow shares (`ORG_ID`, `ACCOUNT`, `SOURCE_ID`, …). Deterministic ids make the analytics assertions exact.

### `fixtures/` — mocked responses

Every builder `parse`s through the real `@heediq/shared` schema, so a fixture that drifts from the contract fails at construction rather than producing a false green. `me.ts` builds `GET /me` per persona (the D-102 authority for `<Can>` gating); `domain.ts` builds Sources, extracted items, Contexts, conversations, and chat messages.

## Writing a flow

```ts
import { test, expect, emitWs } from '../support/test'
import { meResponse } from '../fixtures/me'
import { source } from '../fixtures/domain'
import { ACCOUNT, SOURCE_ID } from '../support/ids'

test('does the thing', async ({ page, api, analytics }) => {
  api.on('GET', '/me', meResponse('admin'))
  api.on('GET', `/sources/${SOURCE_ID}`, { source: source() })

  await page.goto('/...')
  await page.getByRole('button', { name: '...' }).click()

  const evt = await analytics.waitForEvent('some_event', { sourceId: SOURCE_ID })
  expect(evt.user_id).toBe(ACCOUNT.admin)
})
```

Rules of thumb:
- Mock only what the journey actually calls; unmocked calls 404 harmlessly (assert `api.unmatchedCalls()` if a flow must be airtight).
- Assert `user_id` on track events; assert the `org` group with `waitForGroup`.
- For a non-admin journey, `test.use({ persona: 'member' | 'custom' | 'crossOrg' })`.

## Running

```bash
pnpm test:e2e                 # all flows, headless
pnpm test:e2e capture-review  # one flow by filename fragment
pnpm exec playwright test --config playwright.flows.config.ts --ui   # debug UI
```

The config starts its own dev server on port 5273 with `VITE_E2E=1` (and dummy API/WS/Amplitude env), reusing an already-running one locally. In CI it always starts fresh.
