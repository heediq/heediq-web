import type * as AmplitudeBrowser from '@amplitude/analytics-browser'
import type { AnalyticsAuthMethod, ContextVisibility } from '@heediq/shared'
import { decodeJwtPayload } from '../auth/jwt'

/** How a Source entered the system — the `capture_started`/`source_created` funnel dimension (D-151). */
export type CaptureMethod = 'record' | 'audio' | 'text'

/** The two linkable OAuth providers — the subset of `AnalyticsAuthMethod` that isn't `'password'`. */
export type ProviderAuthMethod = Exclude<AnalyticsAuthMethod, 'password'>

/**
 * The full D-154 taxonomy: the D-151 critical-path funnel (capture_started → source_created →
 * source_ready → review_opened → items_kept → chat_sent) plus every other meaningful interaction
 * across all flows.
 *
 * Event properties are **ids / enums / counts only** — never transcript, message, Source title, or
 * email text (D-093). The privacy boundary is enforced structurally here (this map is the only
 * shape `track` accepts) and by disabling Amplitude autocapture in `load()` below. `userId`/`orgId`
 * are never event props — they're identity, set once via `identifyUser` (D-099/D-154).
 */
type EventMap = {
  // ── D-151 critical-path funnel ──────────────────────────────────────────────────────────────
  capture_started: { method: CaptureMethod }
  source_created: { sourceId: string; method: CaptureMethod }
  /** A Source finished processing and is ready for review (the funnel's "transcription/source ready"
   * milestone). Fired off the `classification_ready` WS event via `AnalyticsBridge`. */
  source_ready: { sourceId: string }
  review_opened: { sourceId: string }
  items_kept: { sourceId: string; contextId: string; keptCount: number }
  chat_sent: { conversationId: string; contextId: string }
  // ── Interaction events (D-154 — the broad "sensible activity" taxonomy across every flow). Every
  // event stays ids/enums/counts only (D-093).
  /** A primary-nav destination was tapped. `surface` distinguishes the mobile bottom tab bar from
   * the desktop top bar so funnels can segment by form factor. */
  nav_item_clicked: { item: string; surface: 'top' | 'bottom' }
  /** The user signed out (from Settings → Account). */
  logout_clicked: Record<string, never>

  // ── auth / identity ──────────────────────────────────────────────────────────────────────────
  login_started: { method: AnalyticsAuthMethod }
  login_succeeded: { method: AnalyticsAuthMethod }
  /** A brand-new account started the verify-then-password flow (`/auth/lookup-email` → `!exists`).
   * Distinct from the same flow's reactive provider-linking case, which fires `password_set`
   * instead (there's no new account being created). */
  signup_started: Record<string, never>
  signup_completed: Record<string, never>
  /** Proactive Settings → "Link Google/Microsoft" — not the reactive login-time linking flow, which
   * only ever sets a password on an existing federated account (see `password_set`). */
  provider_link_started: { provider: ProviderAuthMethod }
  provider_link_completed: { provider: ProviderAuthMethod }
  /** An existing session was silently restored from a refresh token on app load (no interactive
   * login happened). */
  session_restored: Record<string, never>
  /** A password was set/confirmed via `/auth/link/confirm` — covers all three D-089 callers
   * (native signup, reactive login-time linking, proactive Settings password-set) uniformly. */
  password_set: Record<string, never>

  // ── capture / source ─────────────────────────────────────────────────────────────────────────
  /** The ingest mutation actually completed — one step past `capture_started` (submit-intent). */
  capture_submitted: { method: CaptureMethod }
  source_detail_opened: { sourceId: string }

  // ── review ────────────────────────────────────────────────────────────────────────────────────
  /** The user picked (or created) the Context to file a Source's items into. Not fired for the
   * classifier's passive auto-seeded default — only an explicit pick. */
  review_context_selected: { sourceId: string; contextId: string; isNew: boolean }

  // ── context library ──────────────────────────────────────────────────────────────────────────
  context_created: { contextId: string; visibility: ContextVisibility }
  context_opened: { contextId: string }

  // ── chat ──────────────────────────────────────────────────────────────────────────────────────
  chat_opened: { contextId: string; conversationId: string }
  /** A turn finished streaming. Fired off the `chat_complete` WS event via `AnalyticsBridge`. */
  chat_response_received: { conversationId: string }
  chat_stopped: { conversationId: string }
  chat_retry: { conversationId: string }
  /** A send was blocked by unsettled Decision Ledger entries (D-149's `LEDGER_GATED` 409). */
  ledger_gate_blocked: { contextId: string }
  /** The user sent anyway via `bypassLedgerGating` after being gated. */
  ledger_gate_overridden: { contextId: string }

  // ── ledger ────────────────────────────────────────────────────────────────────────────────────
  ledger_viewed: { contextId: string }
  /** Review-time async reconciliation merged kept items into the ledger. Fired off the
   * `ledger_ready` WS event via `AnalyticsBridge` (D-148). */
  ledger_reconciled: { contextId: string }

  // ── rbac ──────────────────────────────────────────────────────────────────────────────────────
  role_created: { roleId: string }
  role_updated: { roleId: string }
  role_deleted: { roleId: string }
  group_created: { groupId: string }
  user_role_assigned: { userId: string; roleId: string }

  // ── audit / settings / pwa ───────────────────────────────────────────────────────────────────
  audit_log_viewed: Record<string, never>
  settings_opened: Record<string, never>
  pwa_install_prompted: Record<string, never>
  pwa_installed: Record<string, never>
}

type Amplitude = typeof AmplitudeBrowser

// Resolved once. `null` means "analytics disabled" — no key configured, or the SDK failed to load.
// Cached so the SDK is imported+initialised at most once, and so a missing key stays a cheap no-op.
let amplitudePromise: Promise<Amplitude | null> | null = null

/**
 * Lazy-load + init the Amplitude Browser SDK. The dynamic `import()` keeps the SDK out of the
 * initial bundle (perf budget, `07-engineering-standards.md` §6) and lets the whole app run with
 * analytics simply *absent* when `VITE_AMPLITUDE_API_KEY` isn't set (local dev, or any environment
 * whose SSM key hasn't been provisioned). Analytics must never break the app, so a load/init failure
 * degrades to `null` rather than throwing.
 */
function load(): Promise<Amplitude | null> {
  if (amplitudePromise) return amplitudePromise
  const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY as string | undefined
  if (!apiKey) {
    amplitudePromise = Promise.resolve(null)
    return amplitudePromise
  }
  amplitudePromise = import('@amplitude/analytics-browser')
    .then((amp) => {
      amp.init(apiKey, {
        // Privacy (D-093): emit ONLY the explicit id-only funnel events below. Autocapture /
        // default tracking would otherwise hoover up input values, element text, and full URLs.
        autocapture: false,
        defaultTracking: false,
      })
      return amp
    })
    .catch(() => null)
  return amplitudePromise
}

/** Emit one critical-path funnel event. Fire-and-forget; a no-op when analytics is disabled. */
export function track<K extends keyof EventMap>(name: K, props: EventMap[K]): void {
  void load().then((amp) => amp?.track(name, props))
}

/**
 * Associate subsequent events with the signed-in user. Uses the app-owned `custom:accountId`
 * (D-099) as the Amplitude user id, with `orgId`/`role` as user properties. Reads only id/enum
 * claims off the ID token — never `email` or any other PII (D-093).
 */
export function identifyUser(idToken: string): void {
  void load().then((amp) => {
    if (!amp) return
    const claims = decodeJwtPayload<Record<string, string | undefined>>(idToken)
    const accountId = claims['custom:accountId']
    if (accountId) amp.setUserId(accountId)
    const orgId = claims['custom:orgId']
    // Org-level rollups (D-154): the `org` group joins this user's events with the rest of their org.
    if (orgId) amp.setGroup('org', orgId)
    const identify = new amp.Identify()
    if (orgId) identify.set('orgId', orgId)
    if (claims['custom:role']) identify.set('role', claims['custom:role'])
    amp.identify(identify)
  })
}

/** Clear the identified user on logout so a shared browser doesn't attribute events across accounts. */
export function resetAnalytics(): void {
  void load().then((amp) => amp?.reset())
}

/** Test-only: drop the memoised SDK promise so each test starts from a clean load state. */
export function __resetAnalyticsForTests(): void {
  amplitudePromise = null
}
