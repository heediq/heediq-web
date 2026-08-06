import type { Page } from '@playwright/test'
import type { WsEventEnvelope } from '@heediq/shared'

/**
 * WS mock for the mocked-backend tier (D-155). `WsProvider` does a raw `new WebSocket(url)`; we
 * replace `window.WebSocket` (via an init script, before app code) with a fake that never touches
 * the network, opens immediately, and exposes `window.__wsEmit(envelope)` so a test can
 * deterministically deliver a `WsEventEnvelope` to the app's `onmessage`. This honours D-111 in-test
 * (the app reflects async outcomes off the WS push, not polling) without a server. Envelopes are
 * validated against `WsEventEnvelopeSchema` in `emitWs` before they're sent, so a test can't fire a
 * shape the real provider would drop.
 */
export async function installFakeWebSocket(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const OPEN = 1
    class FakeWebSocket {
      static readonly CONNECTING = 0
      static readonly OPEN = 1
      static readonly CLOSING = 2
      static readonly CLOSED = 3
      readyState = OPEN
      onopen: ((ev: unknown) => void) | null = null
      onmessage: ((ev: { data: string }) => void) | null = null
      onclose: ((ev: unknown) => void) | null = null
      onerror: ((ev: unknown) => void) | null = null
      constructor(_url: string) {
        // Register the live socket so __wsEmit can reach it, then open on the next tick so the
        // provider's onopen assignment has run.
        ;(window as unknown as { __wsSocket?: FakeWebSocket }).__wsSocket = this
        setTimeout(() => this.onopen?.({}), 0)
      }
      send(): void {}
      close(): void {
        this.readyState = FakeWebSocket.CLOSED
        this.onclose?.({})
      }
      addEventListener(): void {}
      removeEventListener(): void {}
    }
    ;(window as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket
    ;(window as unknown as { __wsEmit?: (envelope: unknown) => void }).__wsEmit = (envelope) => {
      const socket = (window as unknown as { __wsSocket?: FakeWebSocket }).__wsSocket
      socket?.onmessage?.({ data: JSON.stringify(envelope) })
    }
  })
}

/** Deliver a WsEventEnvelope to the app. Import the schema lazily so this stays test-only. */
export async function emitWs(page: Page, envelope: WsEventEnvelope): Promise<void> {
  const { WsEventEnvelopeSchema } = await import('@heediq/shared')
  const valid = WsEventEnvelopeSchema.parse(envelope)
  await page.evaluate((e) => {
    ;(window as unknown as { __wsEmit?: (env: unknown) => void }).__wsEmit?.(e)
  }, valid)
}
