# Progress

## Purpose
Determinate progress bar — the kit primitive for any wait where a real percentage can be reported
(file upload, a staged backend job), per `04-loading-and-feedback.md` §5. For indeterminate waits
(unknown duration) use `Spinner` instead; `Progress` always shows a known fraction of completion.

## Props / variants
- `value`: number 0–100 (clamped and rounded)
- `size`: `sm` (4px) · `md` (8px, default)
- `tone`: `accent` (default) · `success` (use on completion)
- `aria-label`: accessible name for the bar; defaults to `"Progress"`

## States
Single visual state driven by `value`; the fill width animates via the shared `duration-base`/
`ease-brand` tokens. Exposes `role="progressbar"` with `aria-valuenow/min/max` so screen readers
announce the value.

## Usage
```tsx
<Progress value={uploadPct} aria-label={t('capture.audio.uploadProgress')} />
<Progress value={100} tone="success" />
```
