# LoadingMark

## Purpose
Canonical loading indicator for page-level and section-level async waits (D-074,
`04-loading-and-feedback.md` §2–3) — replaces a generic spinner at that level. It does **not**
replace `Spinner`, which stays the primitive for inline/button-level loading (§4). An animated,
logo-derived 4-bar mark: the two outer bars read as "ears" (one perks up while the other dips), a
single head-tilt follows, then the ears swap. Keyframes and SVG geometry are copied verbatim from
`design_handoff_heediq_brand/Heediq Style Guide.dc.html` (defined once, globally, in
`src/styles/globals.css` under the `heediq-loader-*` classes/`heediq*` keyframes — not duplicated
per instance).

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
