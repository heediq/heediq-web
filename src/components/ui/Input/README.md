# Input

## Purpose
Text input primitive for forms — first consumer is the unified email-first sign-in/sign-up screen
(D-078, D-081, D-082).

## Props / variants
- `label` (required) — always visible, associated via `htmlFor`/`id` (auto-generated with `useId`
  if `id` isn't passed).
- `error` — renders a `role="alert"` message below the field, sets `aria-invalid` + the danger
  border/ring, and is wired via `aria-describedby`.
- `hint` — non-error helper text below the field (mutually exclusive with `error`; error wins if
  both are set).
- All other native `<input>` props pass through (`type`, `required`, `disabled`, `placeholder`, …).

## States
default · hover (border) · focus-visible (accent ring) · disabled · error (danger border/ring +
message). No loading state — inputs don't run async work themselves; the submitting button carries
loading state (`04-loading-and-feedback.md`).

## Usage
```tsx
<Input
  label={t('auth.emailLabel')}
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
/>
```
