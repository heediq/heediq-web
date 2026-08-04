# ListenButton

## Purpose
The canonical **three-state record control** (`03-ui-kit.md` §4, `04-loading-and-feedback.md` §4) — the
D-026 "Listen" affordance. It cycles `idle → recording → processing` and is the single kit primitive
for starting/stopping a live capture. Built on top of the kit `Button`, so it inherits every Button
state (hover/active/focus-visible/disabled/loading) and the shared motion tokens instead of restyling.

## Props
- `state`: `'idle' | 'recording' | 'processing'` — drives the icon, tone, and interactivity.
- `label`: string — the visible label for the current state (caller resolves it through `t()`; feed the
  live elapsed timer into this for the `recording` state).
- `aria-label`: string — accessible name for the current state (screen readers announce the change).
- `onClick`: `() => void` — fires on `idle` (→ start) and `recording` (→ stop); ignored while
  `processing` (the button is disabled).
- `className?`: layout composition only.

## States
- **idle** — primary Button, mic icon. Click starts recording.
- **recording** — danger Button, a pulsing stop-square (pulse respects `prefers-reduced-motion`). Click
  stops. The caller keeps the elapsed time live via `label`.
- **processing** — the Button `loading` state (spinner + disabled): the recording is uploading and
  can't be re-triggered (double-submit guard, D-120).

Copy is never hardcoded (§1a) — `label` and `aria-label` come in per state from the feature via `t()`.

## Usage
```tsx
<ListenButton
  state={listenState}
  label={t('capture.record.recording', { time: '00:12' })}
  aria-label={t('listenButton.recordingAria', { time: '00:12' })}
  onClick={toggle}
/>
```
