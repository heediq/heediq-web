# LoadingMark

## Purpose
Canonical loading indicator for page-level and section-level async waits (D-074, D-116,
`04-loading-and-feedback.md` §2–3) — replaces a generic spinner at that level. It does **not**
replace `Spinner`, which stays the primitive for inline/button-level loading (§4). An animated
4-bar mark styled as an audio-waveform pulse: each bar scales height independently at a staggered
phase (no group rotation), matching Heediq's audio/transcription product identity (D-116). SVG bar
geometry is unchanged from the original logo-derived mark; only the animation changed. Keyframes
are defined once, globally, in `src/styles/globals.css` under the `heediq-loader-*` classes /
`heediqWave` keyframe — not duplicated per instance.

## Props / variants
- `size`: `sm` (28px, inline contexts) · `lg` (72px, standalone/page-transition, default)
- `tone`: `flat` (solid `accent` fill, default — used for the `sm` inline case) · `gradient`
  (two-tone `#FFC876`→`#E89A26`, decorative one-off scoped to this component only, not a design
  token — used for larger/card contexts)
- `aria-label`: defaults to `"Loading"`, override for context-specific announcements (e.g.
  "Loading sources…")

## States
Single animated state; honors `prefers-reduced-motion` via the global `@media` override in
`globals.css` (falls back to the static mark, no animation). This component is decorative
(`role="status"` + `aria-label`); pair with a visible or sr-only text label for the specific wait
when the context needs one (see the style guide's card-context example: "Loading sources…").

## Usage
```tsx
<LoadingMark size="lg" tone="gradient" aria-label="Loading sources" />
<LoadingMark size="sm" />
```
