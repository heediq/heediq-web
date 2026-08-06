import zlib from 'node:zlib'
import type { Page, Request } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Analytics assertion mechanism (D-155, ties D-154). The app's Amplitude Browser SDK loads (the
 * flows run with a dummy `VITE_AMPLITUDE_API_KEY`) and posts event batches to `*.amplitude.com`. We
 * route-mock that endpoint, capture every posted batch, and let a flow assert the exact event names +
 * id props fired — making the D-154 taxonomy a verifiable contract rather than a hope.
 */
export interface CapturedEvent {
  event_type: string
  user_id?: string
  groups?: Record<string, unknown>
  event_properties?: Record<string, unknown>
}

export interface AnalyticsCapture {
  /** Every event posted so far (across all batches), in order. */
  events(): CapturedEvent[]
  /** Wait until an event with this type (optionally matching these props) has been captured, and return it. */
  waitForEvent(type: string, props?: Record<string, unknown>): Promise<CapturedEvent>
  /** Wait until some captured event establishes the `<name>` group with `<value>` (D-154 org rollup). */
  waitForGroup(name: string, value: string): Promise<void>
}

function matchesProps(event: CapturedEvent, props?: Record<string, unknown>): boolean {
  if (!props) return true
  const actual = event.event_properties ?? {}
  return Object.entries(props).every(([k, v]) => actual[k] === v)
}

export async function installAnalyticsCapture(page: Page): Promise<AnalyticsCapture> {
  const captured: CapturedEvent[] = []

  // The Browser SDK gzips the batch body, so postDataJSON() can't parse it — decompress the raw
  // buffer (gzip, then deflate/brotli, then plain) before JSON.parse.
  const decode = (request: Request): unknown => {
    const buf = request.postDataBuffer()
    if (!buf) return null
    for (const attempt of [() => zlib.gunzipSync(buf), () => zlib.inflateSync(buf), () => zlib.brotliDecompressSync(buf), () => buf]) {
      try {
        return JSON.parse(attempt().toString('utf8'))
      } catch {
        // try the next codec
      }
    }
    return null
  }

  const collect = (request: Request) => {
    const body = decode(request)
    const events = (body as { events?: CapturedEvent[] } | null)?.events
    if (Array.isArray(events)) captured.push(...events)
  }

  // Regex, not a glob: Playwright's URL glob failed to intercept `https://api2.amplitude.com/2/httpapi`
  // (it leaked to the real endpoint). This catches every amplitude.com host — the event ingestion
  // POST (`/2/httpapi`, whose batches we collect) and the remote-config GET (`sr-client-cfg…`, which
  // we stub so nothing leaves the browser and the run stays deterministic + offline).
  await page.route(/https?:\/\/[^/]*amplitude\.com\//, async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      collect(request)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 200, events_ingested: 1 }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  return {
    events: () => [...captured],
    async waitForEvent(type, props) {
      await expect
        .poll(() => captured.some((e) => e.event_type === type && matchesProps(e, props)), {
          timeout: 5000,
          message: `analytics event "${type}"${props ? ' ' + JSON.stringify(props) : ''} was never captured`,
        })
        .toBe(true)
      return captured.find((e) => e.event_type === type && matchesProps(e, props))!
    },
    async waitForGroup(name, value) {
      await expect
        .poll(() => captured.some((e) => e.groups?.[name] === value), {
          timeout: 5000,
          message: `group "${name}=${value}" was never established on any captured event`,
        })
        .toBe(true)
    },
  }
}
