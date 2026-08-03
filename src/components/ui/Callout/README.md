# Callout

## Purpose
An inline banner that surfaces an actionable state **within a flow** — a chat ledger gate (D-149), a
review-wizard reconciliation prompt (D-137 step 3), or any "you need to do something here" notice. It
sits between content and holds arbitrary children (inline fields, buttons), which distinguishes it
from `ErrorState` (a centered full-region fallback for a failed fetch) and from `Badge` (a status
chip, no body).

## Props / variants
- `tone` — `warning` (default, amber accent — attention, not an error) · `danger` (destructive/failed)
  · `info` (neutral). Tones reuse existing semantic tokens; there is no `warning`/`info` color token
  (D-072), so `warning` maps to the amber accent and `info` to the neutral surface.
- `title` — optional heading (`ReactNode`).
- `icon` — override the tone's default lucide icon; pass `null` to omit the icon.
- `children` — the body: free-form content (text, fields, actions).

## States
Static container. Interactive children (buttons, inputs) carry their own kit states. `role="status"`
so assistive tech announces it when it appears.

## Usage
```tsx
<Callout tone="warning" title={t('chat.gating.title')}>
  <ul>…blocking topics with inline answer fields…</ul>
  <Button variant="ghost" onClick={sendAnyway}>{t('chat.gating.sendAnyway')}</Button>
</Callout>
```
