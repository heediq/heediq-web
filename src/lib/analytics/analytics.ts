import type * as AmplitudeBrowser from '@amplitude/analytics-browser'
import { decodeJwtPayload } from '../auth/jwt'

/** How a Source entered the system — the `capture_started`/`source_created` funnel dimension (D-151). */
export type CaptureMethod = 'record' | 'audio' | 'text'

/**
 * The MVP critical-path funnel (D-151): capture_started → source_created → source_ready →
 * review_opened → items_kept → chat_sent.
 *
 * Event properties are **ids / enums / counts only** — never transcript, message, Source title, or
 * email text (D-093). The privacy boundary is enforced structurally here (this map is the only
 * shape `track` accepts) and by disabling Amplitude autocapture in `load()` below.
 */
type EventMap = {
  capture_started: { method: CaptureMethod }
  source_created: { sourceId: string; method: CaptureMethod }
  /** A Source finished processing and is ready for review (the funnel's "transcription/source ready"
   * milestone). Fired off the `classification_ready` WS event via `AnalyticsBridge`. */
  source_ready: { sourceId: string }
  review_opened: { sourceId: string }
  items_kept: { sourceId: string; contextId: string; keptCount: number }
  chat_sent: { conversationId: string; contextId: string }
  // ── Interaction events (beyond the D-151 critical-path funnel). The broad "sensible activity"
  // taxonomy is formalised under D-154; every event here stays ids/enums/counts only (D-093).
  /** A primary-nav destination was tapped. `surface` distinguishes the mobile bottom tab bar from
   * the desktop top bar so funnels can segment by form factor. */
  nav_item_clicked: { item: string; surface: 'top' | 'bottom' }
  /** The user signed out (from Settings → Account). */
  logout_clicked: Record<string, never>
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
    const identify = new amp.Identify()
    if (claims['custom:orgId']) identify.set('orgId', claims['custom:orgId'])
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
