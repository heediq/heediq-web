# features/auth

First folder under `src/features/` — feature-level components shared across route screens, as
distinct from `src/lib/auth/` (auth primitives/state) and `src/components/ui/` (the UI kit).

## Purpose
One shared component implementing Heediq's own-verification email-confirmation model (D-089):
prove ownership of an email with a code Heediq itself sends, then set a password, always as two
separate screens — never combined into one form. This replaced trusting an IdP's `email_verified`
claim, which let a Google-authenticated user land straight on an unverified "create a password"
prompt after logging out and re-entering the same email natively — the bug that motivated D-089.

## Key Files
- `VerifyAndSetPasswordForm.tsx` — the shared component. Reused, with the same backend calls and
  UI, by all three D-089 entry points:
  1. **Reactive login-time linking** — `HomePage`, when `lookup-email` finds an existing
     federated-only account (`passwordSet: false`).
  2. **Native signup** — `HomePage`, when `lookup-email` finds no account at all. There is no
     separate signup form; a first-time email goes through the identical verify-then-password UI.
  3. **Proactive Settings linking** — `SettingsPage`, when the caller has no `COGNITO` method active
     yet (per `GET /auth/methods`, D-091).

## Data Flow / How It Works
On mount, the component calls `POST /auth/link/request-otp` itself (callers never trigger the OTP
send separately). Five phases: `sendingCode` (brief loading state) → `sent` (a fixed ~500ms
confirmation beat — checkmark + "Code sent to {email}" — before the code input appears, so the send
doesn't feel instantaneous/opaque; min-display-time pattern per `04-loading-and-feedback.md` §10) →
`code` (enter the emailed code; submitting calls `POST /auth/link/verify-otp` — only advances to
`password` on success, otherwise shows an inline error and stays on the code screen) → `password`
(create + confirm password fields; mismatched values error inline without a network call); or
`rateLimited` instead of `sent`/`code`, if `request-otp` itself comes back `RATE_LIMITED` (D-097) — no
code was actually sent, so the component shows a dedicated `ErrorState` with retry rather than a
code-entry screen that has nothing to verify. Final submit calls `POST /auth/link/confirm` with
`{ email, newPassword }` (no `code` — it was already consumed by `verify-otp`); on success it calls
the caller-supplied `onSuccess(password)` and lets the caller decide what happens next.

Every phase transition renders through `AnimatePresence` + the shared `fadeUpVariants`
(`src/lib/motion.ts`, D-117) instead of an instant swap. The `code` and `password` submits go through
the shared `useAsyncAction` hook (`src/lib/useAsyncAction.ts`) rather than local `submitting` state, so
a rapid double-click on "Continue"/"Set password" can't fire the request twice
(`04-loading-and-feedback.md` §4).

## Contracts
- Props: `email: string` (the address to verify — caller resolves this, e.g. from the sign-in form
  input or `GET /me`), `onSuccess: (password: string) => void | Promise<void>`, `onBack?: () => void`
  (omitted by `SettingsPage`, which has no "different email" step to go back to).
- `onSuccess` behavior differs deliberately by caller: `HomePage` signs the user in with the new
  password; `SettingsPage` invalidates its `authMethods` query instead (the user is already
  authenticated — no session change needed).
- Backend contract (owned by `heediq-api`, not duplicated here): see `src/lib/auth/README.md` and
  `heediq-api/README.md`'s Contracts section for `POST /auth/link/request-otp` /
  `POST /auth/link/verify-otp` / `POST /auth/link/confirm`.
- The password step shows a live, per-rule requirements checklist (`PasswordRequirements`, driven by
  `@heediq/shared`'s `PASSWORD_POLICY_RULES`) and disables submit until
  `isPasswordPolicyCompliant(newPassword)` is true. If `link/confirm` still rejects the password
  server-side (Cognito `InvalidPasswordException` → `WEAK_PASSWORD`), the form shows a dedicated
  "doesn't meet the requirements above" message instead of the generic failure message — detected via
  `err instanceof ApiClientError && err.code === 'WEAK_PASSWORD'`.
- A `RATE_LIMITED` error code (D-097, from either `request-otp` or `verify-otp`) is handled
  distinctly per call site: on `request-otp` it moves to the `rateLimited` phase (dedicated
  `ErrorState`, retry re-fires `request-otp`); on `verify-otp` it stays on the `code` phase but shows
  a specific "too many attempts" message (`errors.auth.RATE_LIMITED`) instead of falling into the
  generic invalid-code copy.

## Dependencies
- **Upstream:** `apiClient` and its `ApiClientError` class (`src/lib/api-client.ts`), the
  `Button`/`Input`/`LoadingMark`/`PasswordRequirements` UI-kit primitives,
  `isPasswordPolicyCompliant` / `PASSWORD_POLICY_RULES` (`@heediq/shared`), `auth.verify.*` and
  `auth.passwordRequirements.*` i18n keys (`src/i18n/locales/en/translation.json`).
- **Downstream:** `HomePage.tsx`, `SettingsPage.tsx`.

## Testing
`__tests__/VerifyAndSetPasswordForm.test.tsx` covers every phase in isolation (OTP-send loading
state, OTP-send failure still advancing to the code step, the `sent` confirmation phase appearing
before the code step, code verified via `link/verify-otp` before advancing to password, an invalid
code staying on the code step with an inline error, password mismatch, successful submit calling
`onSuccess`, `link/confirm` failure, and the optional back button), plus the live password checklist
disabling/enabling submit as rules are satisfied, the specific `WEAK_PASSWORD` error message on a
policy rejection, the `RATE_LIMITED` handling on both `request-otp` (dedicated error state, retry
re-fires the send) and `verify-otp` (distinct inline message on the code step), and a double-submit
guard regression test for each of the code and set-password submit buttons (rapid double-click calls
the backend exactly once), with `apiClient` mocked. Page-level tests (`HomePage.test.tsx`,
`SettingsPage.test.tsx`) exercise the same component through the real DOM but don't re-assert every
phase — they check the handoff (correct `email` passed in, `onSuccess` wired to the right caller
behavior).

## Gotchas & Constraints
- The two-step (code, then password) structure is a locked decision (D-089), not a UI preference —
  don't collapse them back into one form even if it looks like less friction (see Purpose for why).
  Each step is backend-verified in its own request (`verify-otp`, then `confirm`) — the code step
  must never advance on local state alone, since that previously let anyone reach the password
  screen with an unverified/wrong code (the code was only ever checked later, too late, inside the
  password-submit call).
- Don't call `onSuccess` from anywhere except after a successful `POST /auth/link/confirm` — it's the
  only signal callers have that the password is actually set server-side.
