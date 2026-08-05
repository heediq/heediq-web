# Analytics (`src/lib/analytics/`)

Product analytics for Heediq's full activity taxonomy (**D-154**, extending the D-151 critical-path
funnel). Vendor: **Amplitude** (free tier), Browser SDK. This module is the single boundary through
which every client event flows.

## Files
- **`analytics.ts`** — the whole client surface: `track(name, props)`, `identifyUser(idToken)`,
  `resetAnalytics()`. Lazy-loads + inits the Amplitude SDK on first use.
- **`AnalyticsBridge.tsx`** — a render-null, app-level component that turns WS events into analytics
  events: `classification_ready` → `source_ready`, `chat_complete` → `chat_response_received`,
  `ledger_ready` → `ledger_reconciled`. Mounted inside `WsProvider` in `App.tsx`.

## Identity & cross-service correlation (D-154)
- `userId` = `custom:accountId` (D-099, never Cognito `sub`) → Amplitude **`user_id`**, set via
  `identifyUser`'s `setUserId`. Same identity is used server-side (heediq-api's Amplitude Node emit
  helper), so client and server events for one user stitch together.
- `orgId` = `custom:orgId` → Amplitude **Group** `org` via `setGroup('org', orgId)`, plus an `orgId`
  user property. Enables org-level funnels/retention rollups across services.
- No shared `session_id` is threaded through the pipeline. Cross-service funnels join on the
  **entity id** an event shares with its counterpart (e.g. client `capture_started {sourceId}` and a
  server-side `source_processing_completed {sourceId}` join on `sourceId` under one `user_id`).

## The taxonomy (event names)
Each event's properties are ids, enums, and counts only (D-093).

### D-151 critical-path funnel
| Event | Fired from | Props |
|---|---|---|
| `capture_started` | the three Capture forms (`features/sources/*IngestForm.tsx`) | `{ method: 'record'\|'audio'\|'text' }` |
| `source_created` | the ingest hooks (`features/sources/sources-api.ts`) | `{ sourceId, method }` |
| `source_ready` | `AnalyticsBridge` (off `classification_ready` WS) | `{ sourceId }` |
| `review_opened` | `routes/ReviewWizardPage.tsx` (on mount) | `{ sourceId }` |
| `items_kept` | `ReviewWizardPage` (review mutation success) | `{ sourceId, contextId, keptCount }` |
| `chat_sent` | `features/chat/ChatThread.tsx` (`send`) | `{ conversationId, contextId }` |
| `nav_item_clicked` | primary nav (top bar / bottom tab bar) | `{ item, surface: 'top'\|'bottom' }` |
| `logout_clicked` | Settings → Account | `{}` |

### auth / identity
| Event | Fired from | Props |
|---|---|---|
| `login_started` | `HomePage` sign-in submit, SSO button click | `{ method }` |
| `login_succeeded` | `HomePage` (password paths), `AuthCallbackPage` (federated) | `{ method }` |
| `signup_started` | `HomePage` email lookup, when the account doesn't exist | `{}` |
| `signup_completed` | `VerifyAndSetPasswordForm` (`isSignup` caller only) | `{}` |
| `provider_link_started` | Settings → "Link Google/Microsoft" | `{ provider }` |
| `provider_link_completed` | `SettingsLinkCallbackPage` | `{ provider }` |
| `session_restored` | `AuthContext` refresh-token bootstrap | `{}` |
| `password_set` | `VerifyAndSetPasswordForm` (all 3 callers: signup, reactive linking, proactive Settings) | `{}` |

### capture / source
| Event | Fired from | Props |
|---|---|---|
| `capture_submitted` | the three Capture forms, after the ingest mutation resolves | `{ method }` |
| `source_detail_opened` | `routes/SourceDetailPage.tsx` (on mount) | `{ sourceId }` |

### review
| Event | Fired from | Props |
|---|---|---|
| `review_context_selected` | `ReviewWizardPage` (explicit Context pick or create) | `{ sourceId, contextId, isNew }` |

### context library
| Event | Fired from | Props |
|---|---|---|
| `context_created` | `CreateContextModal` (create mutation success) | `{ contextId, visibility }` |
| `context_opened` | `ContextDetailPanel` (on data load) | `{ contextId }` |

### chat
| Event | Fired from | Props |
|---|---|---|
| `chat_opened` | `ChatThread` (mount, per conversation) | `{ contextId, conversationId }` |
| `chat_response_received` | `AnalyticsBridge` (off `chat_complete` WS) | `{ conversationId }` |
| `chat_stopped` | `ChatComposer` stop button | `{ conversationId }` |
| `chat_retry` | `ChatThread` (`retry`) | `{ conversationId }` |
| `ledger_gate_blocked` | `ChatThread` (D-149 `LEDGER_GATED` 409) | `{ contextId }` |
| `ledger_gate_overridden` | `ChatThread` ("send anyway" after gate) | `{ contextId }` |

### ledger
| Event | Fired from | Props |
|---|---|---|
| `ledger_viewed` | `LedgerSection` (mount) | `{ contextId }` |
| `ledger_reconciled` | `AnalyticsBridge` (off `ledger_ready` WS, D-148) | `{ contextId }` |

### rbac
| Event | Fired from | Props |
|---|---|---|
| `role_created` / `role_updated` / `role_deleted` | `RolesPanel` mutations | `{ roleId }` |
| `group_created` | `GroupsPanel` (create mutation success) | `{ groupId }` |
| `user_role_assigned` | `AssignmentsModal` (role assignment only — see gap below) | `{ userId, roleId }` |

### audit / settings / pwa
| Event | Fired from | Props |
|---|---|---|
| `audit_log_viewed` | `routes/AuditLogPage.tsx` (mount) | `{}` |
| `settings_opened` | `routes/SettingsPage.tsx` (mount) | `{}` |
| `pwa_install_prompted` | `useInstallPrompt` (`promptInstall`) | `{}` |
| `pwa_installed` | `useInstallPrompt` (`appinstalled` event) | `{}` |

`source_ready` is named for the *outcome* (a Source is ready for review), not the ingest path — text
sources skip transcription, so a transcription-specific name would be wrong for them.

### Acknowledged gaps
No UI exists yet for these, so they're deferred (tracked in `BACKLOG.md`), not stubbed:
`source_deleted`, `context_archived`, `context_grant_created`, and group (as opposed to role)
assignment in `AssignmentsModal`.

## Privacy (D-093) — the hard rule
**Event properties are ids, enums, and counts only.** Never a transcript, message, Source title,
email, or any free text. This is enforced several ways:
1. `track` only accepts the typed `EventMap` — there is no free-form property bag.
2. Amplitude **autocapture / default tracking is disabled** in `init()`, so the SDK never
   auto-collects input values, element text, or full URLs.
3. A unit test scans the `EventMap` source text for denylisted property names
   (`email`/`transcript`/`message`/`title`/`password`/`token`/`secret`) so a violation fails loudly.

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
`AnalyticsBridge` rather than coupling it to a screen. Update the tables above.
