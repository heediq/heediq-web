# Analytics (`src/lib/analytics/`)

Product analytics for the MVP critical-path funnel (**D-151**). Vendor: **Amplitude** (free tier),
Browser SDK. This module is the single boundary through which every funnel event flows.

## Files
- **`analytics.ts`** — the whole client surface: `track(name, props)`, `identifyUser(idToken)`,
  `resetAnalytics()`. Lazy-loads + inits the Amplitude SDK on first use.
- **`AnalyticsBridge.tsx`** — a render-null, app-level component that turns the `classification_ready`
  WS event into the `source_ready` funnel event. Mounted inside `WsProvider` in `App.tsx`.

## The funnel (event names)
Fired in critical-path order; each is an explicit call, one per user action:

| Event | Fired from | Props (ids/enums/counts only) |
|---|---|---|
| `capture_started` | the three Capture forms (`features/sources/*IngestForm.tsx`) | `{ method: 'record'\|'audio'\|'text' }` |
| `source_created` | the ingest hooks (`features/sources/sources-api.ts`) | `{ sourceId, method }` |
| `source_ready` | `AnalyticsBridge` (off `classification_ready` WS) | `{ sourceId }` |
| `review_opened` | `routes/ReviewWizardPage.tsx` (on mount) | `{ sourceId }` |
| `items_kept` | `ReviewWizardPage` (review mutation success) | `{ sourceId, contextId, keptCount }` |
| `chat_sent` | `features/chat/ChatThread.tsx` (`send`) | `{ conversationId, contextId }` |

`source_ready` is the funnel's "transcription/source ready" milestone. It's named for the *outcome*
(a Source is ready for review), not the ingest path — text sources skip transcription, so a
transcription-specific name would be wrong for them.

## Privacy (D-093) — the hard rule
**Event properties are ids, enums, and counts only.** Never a transcript, message, Source title,
email, or any free text. This is enforced two ways:
1. `track` only accepts the typed `EventMap` above — there is no free-form property bag.
2. Amplitude **autocapture / default tracking is disabled** in `init()`, so the SDK never
   auto-collects input values, element text, or full URLs.

`identifyUser` reads only `custom:accountId` (the Amplitude user id, D-099), `custom:orgId`, and
`custom:role` off the ID token — never `email`.

## Key handling & the no-op path
- The public **API key** (not a secret; safe in the browser bundle) is read from
  `import.meta.env.VITE_AMPLITUDE_API_KEY`, baked at build time from SSM
  `/heediq/web/amplitude-api-key` (see `.github/workflows/deploy.yml`).
- **No key → clean no-op.** With the var unset (local dev, or an environment whose SSM param isn't
  provisioned yet) the SDK is never even imported and every `track`/`identify` call is a cheap
  no-op. Analytics must never break or block the app — load/init failures degrade to disabled.
- The SDK is loaded via dynamic `import()`, so it stays out of the initial bundle (perf budget,
  `07-engineering-standards.md` §6) and lands in its own chunk.

## Adding an event
Add a key to `EventMap` in `analytics.ts` (id/enum/count props only), then call
`track('<name>', { … })` at the action site. If it needs to fire off a WS event, add it to
`AnalyticsBridge` rather than coupling it to a screen. Update the table above.
