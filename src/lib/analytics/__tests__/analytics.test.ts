import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import analyticsSource from '../analytics.ts?raw'

// One shared mock of the Amplitude Browser SDK. `Identify` records what properties get set so the
// D-093 "no PII" guarantee is assertable.
const identifySet = vi.fn()
const mockInit = vi.fn()
const mockTrack = vi.fn()
const mockSetUserId = vi.fn()
const mockSetGroup = vi.fn()
const mockIdentify = vi.fn()
const mockReset = vi.fn()

vi.mock('@amplitude/analytics-browser', () => ({
  init: mockInit,
  track: mockTrack,
  setUserId: mockSetUserId,
  setGroup: mockSetGroup,
  identify: mockIdentify,
  reset: mockReset,
  Identify: class {
    set = identifySet
  },
}))

// A JWT whose payload carries the claims identifyUser reads — plus an email it must NOT forward.
function makeIdToken(payload: Record<string, string>): string {
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${b64}.sig`
}

async function freshModule() {
  vi.resetModules()
  return import('../analytics')
}

describe('analytics (D-151 funnel, D-093 privacy)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('with no VITE_AMPLITUDE_API_KEY (disabled)', () => {
    it('is a clean no-op — SDK never initialised or called', async () => {
      vi.stubEnv('VITE_AMPLITUDE_API_KEY', '')
      const { track, identifyUser, resetAnalytics } = await freshModule()

      track('capture_started', { method: 'text' })
      identifyUser(makeIdToken({ 'custom:accountId': 'acc-1' }))
      resetAnalytics()
      await vi.waitFor(() => expect(true).toBe(true))

      expect(mockInit).not.toHaveBeenCalled()
      expect(mockTrack).not.toHaveBeenCalled()
      expect(mockSetUserId).not.toHaveBeenCalled()
    })
  })

  describe('with a key (enabled)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_AMPLITUDE_API_KEY', 'test-key')
    })

    it('inits once and forwards a funnel event with its id/enum props', async () => {
      const { track } = await freshModule()
      track('source_created', { sourceId: 's-1', method: 'record' })

      await vi.waitFor(() => expect(mockTrack).toHaveBeenCalledWith('source_created', { sourceId: 's-1', method: 'record' }))
      expect(mockInit).toHaveBeenCalledOnce()
      expect(mockInit).toHaveBeenCalledWith('test-key', expect.objectContaining({ autocapture: false }))
    })

    it('identifies with accountId + org/role only — never email (D-093)', async () => {
      const { identifyUser } = await freshModule()
      identifyUser(
        makeIdToken({
          'custom:accountId': 'acc-1',
          'custom:orgId': 'org-1',
          'custom:role': 'admin',
          email: 'secret@example.com',
        }),
      )

      await vi.waitFor(() => expect(mockSetUserId).toHaveBeenCalledWith('acc-1'))
      expect(identifySet).toHaveBeenCalledWith('orgId', 'org-1')
      expect(identifySet).toHaveBeenCalledWith('role', 'admin')
      // The email claim must never be forwarded as a user property.
      expect(identifySet).not.toHaveBeenCalledWith('email', expect.anything())
      const forwardedValues = identifySet.mock.calls.map((c) => c[1])
      expect(forwardedValues).not.toContain('secret@example.com')
    })

    it('sets the org group for cross-service rollups (D-154)', async () => {
      const { identifyUser } = await freshModule()
      identifyUser(makeIdToken({ 'custom:accountId': 'acc-1', 'custom:orgId': 'org-1' }))

      await vi.waitFor(() => expect(mockSetGroup).toHaveBeenCalledWith('org', 'org-1'))
    })

    it('skips the org group when no orgId claim is present', async () => {
      const { identifyUser } = await freshModule()
      identifyUser(makeIdToken({ 'custom:accountId': 'acc-1' }))

      await vi.waitFor(() => expect(mockSetUserId).toHaveBeenCalledWith('acc-1'))
      expect(mockSetGroup).not.toHaveBeenCalled()
    })

    it('reset clears the identified user on logout', async () => {
      const { resetAnalytics } = await freshModule()
      resetAnalytics()
      await vi.waitFor(() => expect(mockReset).toHaveBeenCalledOnce())
    })

    // Representative sample of the D-154 taxonomy additions — one per domain — confirming each is
    // forwarded verbatim rather than exhaustively re-testing every one of the ~35 events.
    it.each([
      ['login_started', { method: 'google' }],
      ['signup_completed', {}],
      ['context_created', { contextId: 'ctx-1', visibility: 'personal' }],
      ['chat_response_received', { conversationId: 'conv-1' }],
      ['ledger_gate_blocked', { contextId: 'ctx-1' }],
      ['role_created', { roleId: 'role-1' }],
      ['audit_log_viewed', {}],
      ['pwa_installed', {}],
    ] as const)('forwards %s with its props', async (name, props) => {
      const { track } = await freshModule()
      track(name, props)

      await vi.waitFor(() => expect(mockTrack).toHaveBeenCalledWith(name, props))
    })
  })
})

// Structural D-093 guard: every EventMap entry must be ids/enums/counts only. Types are erased at
// runtime, so this scans the source text of the EventMap block for denylisted property names
// instead — it fails loudly if anyone ever adds a `email`/`transcript`/`message`/`title` prop.
describe('EventMap denylist guard (D-093)', () => {
  const DENYLIST = /\b(email|transcript|message|title|password|token|secret)\s*:/i

  it('contains no denylisted property keys', () => {
    const start = analyticsSource.indexOf('type EventMap = {')
    const end = analyticsSource.indexOf('\n}\n', start)
    expect(start).toBeGreaterThan(-1)
    const eventMapBlock = analyticsSource.slice(start, end)

    expect(eventMapBlock).not.toMatch(DENYLIST)
  })
})
