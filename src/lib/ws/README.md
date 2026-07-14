# WebSocket client (`src/lib/ws/`)

## Purpose
Centralizes the frontend's real-time connection to `heediq-infra`'s WebSocket API (`WebSocketStack`,
D-061/D-109). Owns the socket lifecycle (connect/reconnect/close) in one place; features never open
their own `WebSocket`. Event dispatch is decentralized by design (D-110): each feature subscribes only
to the event `type`(s) it cares about via `useWsEvent`, instead of a central switch/reducer that would
need to know about every feature's payload handling.

## Key Files
- `WsProvider.tsx` — connects when `useAuth().status === 'authenticated'`, parses every inbound
  message through `WsEventEnvelopeSchema` (`@heediq/shared`), and fans out parsed events to
  subscribers by `type`. Exposes `useWsContext()` (throws outside a `WsProvider`).
- `useWsEvent.ts` — typed hook features call: `useWsEvent('job_status', handler)`. Subscribes on
  mount, unsubscribes on unmount/dependency change. `handler`'s payload type is inferred from
  `WsEventPayloadMap` via the `type` argument — adding a new event to the shared registry doesn't
  require touching `WsProvider`.
- `__tests__/WsProvider.test.tsx` — lifecycle tests (connect/reconnect/backoff/dispatch) against a
  hand-rolled `FakeWebSocket`.

## Data Flow
1. `App.tsx` mounts `WsProvider` between `AuthProvider` and `Routes`.
2. On `status === 'authenticated'`, `WsProvider` opens
   `` `${wsUrl()}?token=<ID token>` `` (see Contracts).
3. On `onmessage`, the raw string is JSON-parsed then validated with `WsEventEnvelopeSchema.safeParse`.
   Anything that fails to parse (bad JSON, unknown `type`, shape mismatch) is silently dropped — the
   connection is not torn down for one bad message.
4. On successful parse, `parsed.data.payload` is dispatched to every handler registered for
   `parsed.data.type` via the internal `Map<string, Set<handler>>`.
5. A feature component calls `useWsEvent(type, handler)`; the hook subscribes through
   `useWsContext().subscribe` and unsubscribes on unmount.

## Contracts
- **Connection URL**: `VITE_WS_BASE_URL` (via `wsUrl()` in `../api-client.ts`) with `?token=<ID
  token>` — the Cognito **ID** token (`getIdToken()` from `../auth/token-store`), not the access
  token, since only the ID token carries `custom:orgId`/`custom:role` (PreTokenGeneration trigger).
- **Envelope shape**: `WsEventEnvelopeSchema` / `WsEventPayloadMap` from `@heediq/shared` (`ws.ts`) —
  the single source of truth for event `type`s and their payload shapes, shared with the backend
  pusher (`heediq-api`'s `wsPush.ts`).
- **Reconnect**: exponential backoff, 1000ms initial, doubling, capped at 30000ms, reset to 1000ms on
  a successful `onopen`. No reconnect after the `WsProvider` itself unmounts (cancels the pending
  timer and closes the socket without triggering `onclose`'s retry path).

## Dependencies
- **Upstream**: `@heediq/shared` `^0.12.0` (`ws.ts` envelope/registry types), `../auth/AuthContext`
  (`useAuth().status`), `../auth/token-store` (`getIdToken`), `../api-client` (`wsUrl()`),
  `heediq-infra`'s `WebSocketStack` (the actual endpoint), `heediq-api`'s `wsPush.ts` pushers (the
  actual event source).
- **Downstream**: any feature that calls `useWsEvent` — none yet (`SourcesLibraryPage`/
  `SourceDetailPage` are still stubs; wiring `job_status` → `queryClient.invalidateQueries` is future
  work, not part of this module).
- **Shared surfaces**: `@heediq/shared`'s `WsEventPayloadMap` — adding a new event type there is what
  makes it available to `useWsEvent` on this side.

## Testing
`__tests__/WsProvider.test.tsx` (7 tests, Vitest + fake timers + a `FakeWebSocket` stub via
`vi.stubGlobal`): no-connect-when-unauthenticated, connect-with-token-in-URL, dispatch-parsed-event,
drop-malformed-message, reconnect-with-backoff, close-on-unmount-no-reconnect,
stop-notifying-after-unsubscribe.

## Gotchas & Constraints
- Must use the **ID token**, not the access token — see Contracts.
- Message parsing failures are silent by design (no throw, no toast) — a single malformed/unknown-type
  frame must never take down the socket or spam the user; add a `console` debug log here if this ever
  needs visibility during development.
- Event dispatch is intentionally **not** centralized beyond routing by `type` (D-110) — don't add a
  global switch/reducer here; a feature that needs to react to `job_status` (or any future event type)
  owns that reaction itself via `useWsEvent`.
