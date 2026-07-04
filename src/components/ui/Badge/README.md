# Badge

## Purpose
Small status label, e.g. job/source pipeline stage (`queued`, `transcribing`, `done`, `failed`).
Colors are locked in D-072. Composed into `SourceCard`-style cards (see
`Heediq Style Guide.dc.html`'s "Status badges" and "Card" sections) — not yet consumed by a page.

## Props / variants
- `tone`: `neutral` (default — queued/starting) · `active` (transcribing/diarizing/summarizing) ·
  `success` (done) · `danger` (failed)
- `size`: `sm` · `md` (default)

## States
Static, non-interactive — no hover/focus/disabled states.

## Usage
```tsx
<Badge tone="success">done</Badge>
<Badge tone="active">transcribing</Badge>
```
