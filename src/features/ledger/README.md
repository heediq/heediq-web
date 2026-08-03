# features/ledger

## Purpose
The Decision Ledger UI for a Context (D-136/D-148/D-149) — a curated, deduplicated roll-up of key
decisions and open questions. This module owns the **standing** per-Context ledger view (embedded in
the context detail panel) plus the shared data hooks and row/badge components that the review wizard's
step 3 (D-137) and the chat gating banner (D-149) also consume.

## Key files
- `ledger-api.ts` — React Query hooks over `/contexts/:id/ledger[/:entryId]`: `useLedger` (GET list),
  `useCreateLedgerEntry` (POST), `useUpdateLedgerEntry` (PATCH), `useDeleteLedgerEntry` (DELETE), and
  `ledgerKeys`. Writes reuse the backend `context:update` permission.
- `LedgerSection.tsx` — the standing section: header, add-entry form (topic only → opens `open`), and
  the three-branch list (skeleton / empty / error+retry, `04-loading-and-feedback.md` §10).
- `LedgerEntryRow.tsx` — one entry: topic + status badge + answer, with inline fill/edit and delete.
  Writes are wrapped in the double-submit guard (`useAsyncAction`) and hidden behind
  `<Can permission="context:update">` (UX-only; the server is the real gate).
- `LedgerStatusBadge.tsx` — status → `Badge` tone: `confirmed`→success, `needs_review`→amber `active`
  (no dedicated warning token, D-072), `open`→neutral.

## Data flow
`LedgerSection` → `useLedger(contextId)` → `GET /contexts/:id/ledger` → `{ entries }`. A row's save
PATCHes `{ answer }` and lets the API derive status (null → `open`, else `confirmed`, D-136); clearing
the answer reopens the entry. Every mutation invalidates `ledgerKeys.list(contextId)`.

## Contracts
- Entry shape: `DecisionLedgerEntry` from `@heediq/shared` (0.15.4).
- `origin: 'user'` and `confidence: 1.0` are forced server-side on any UI write — the client never
  sends them.

## Gotchas
- The row's write controls are permission-gated in the UI only; a user without `context:update` still
  sees the ledger (read) but no edit/add/delete affordances.
- `needs_review` deliberately shares the amber `active` tone with "in-progress" — there is no separate
  warning color token by design (D-072).
