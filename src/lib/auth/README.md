# Auth (heediq-web)

## Purpose
Client-direct Cognito authentication for the unified email-first sign-in screen (D-078, D-081) plus
own-verification account setup and linking (D-089) and proactive cross-provider linking (D-079). Per
D-082, the app talks to Cognito directly wherever Cognito's own public APIs allow it — no backend
round trip for sign-in/password-reset — keeping the backend surface minimal. Ownership of the email
is always proven by Heediq's own emailed code (D-089/D-090), never inferred from an IdP's asserted
`email_verified` — this is what the shared `VerifyAndSetPasswordForm` component
(`src/features/auth/README.md`) enforces for every entry point that needs a password set.

## Key Files
- `cognito-idp.ts` — direct `fetch()` calls to Cognito's unauthenticated IdP JSON API
  (`ResendConfirmationCode`, `InitiateAuth` (`USER_PASSWORD_AUTH`), `ForgotPassword`,
  `ConfirmForgotPassword`). No SDK, no IAM credentials — only the User Pool Client ID is needed.
  Throws `CognitoIdpError` with the bare exception name (namespaced `__type` split on `#`) so callers
  can map it to a user-facing message. Does **not** export `signUp`/`confirmSignUp` (removed under
  D-089) — the OTP send/verify/confirm round trip for a new or linking account always goes through
  `heediq-api`'s `POST /auth/link/request-otp` / `POST /auth/link/verify-otp` /
  `POST /auth/link/confirm` instead, since D-089 unified native signup and linking onto the same
  backend flow.
- `cognito-oauth.ts` — the Hosted-UI PKCE OAuth round trips: `startLogin(provider?)`/
  `exchangeCodeForTokens()` for normal login (`/auth/callback`), `startProviderLink()`/
  `exchangeLinkCodeForTokens()` for proactive provider linking (`/settings/link-callback`, D-083),
  plus `refreshTokens()` and `logoutUrl()`. `startLogin`'s optional `provider` param (`'Google'` |
  `'Microsoft'`) is passed through as Cognito's `identity_provider` query param, sending the user
  straight to that IdP and skipping Cognito's own generic picker (D-118) — used by the separate
  Google/Microsoft `IdentityProviderButton`s on `HomePage`
  (`src/components/ui/IdentityProviderButton/README.md`); omitted, it falls back to the picker.
  Whenever a `provider` is set (both `startLogin` and `startProviderLink`), `prompt=select_account`
  is also sent, forcing the IdP's own account chooser instead of silently reusing whatever Google/
  Microsoft session the browser already has — otherwise a user with multiple accounts on the same
  IdP has no way to pick a different one on a second login.
- `pkce.ts` — PKCE verifier/challenge/state generation on Web Crypto, no external PKCE library.
- `jwt.ts` — `decodeJwtPayload()`, a hand-written base64url JSON decode (no `jwt-decode` dependency,
  consistent with the "no new dependency" approach used throughout this module). Signature is never
  verified client-side — only used to read claims for display/derived values, never for
  authorization.
- `token-store.ts` — in-memory access/ID token (never persisted) + `localStorage`-persisted refresh
  token, so a page reload doesn't force a full Hosted-UI redirect.
- `AuthContext.tsx` — `useAuth()` hook exposing `status`/`login`/`logout`/`applyTokens`; the one
  place that writes to `token-store`.
- `ProtectedRoute.tsx` — redirects to `/` when `status !== 'authenticated'`. The `status === 'loading'`
  wait is shown through `FullPageLoading` gated by `usePerceivedLoading` (`src/lib/usePerceivedLoading.ts`,
  D-122): a session check that resolves in under 150ms never shows a loading screen at all, and one
  that does show it stays up at least 600ms — see `src/components/ui/FullPageLoading/README.md`.
- `useOAuthCallbackGuard.ts` (D-113) — marks an OAuth authorization `code` as consumed in
  `sessionStorage` synchronously on first render; both OAuth callback pages consult it before
  running their one-time exchange, so a duplicate invocation of the same callback URL (reload,
  browser back/forward, duplicate navigation) short-circuits to the success path instead of
  replaying an already-consumed code (which always fails, since the code is single-use, even
  though the original attempt already succeeded server-side).

## Data Flow / How It Works
**Normal login (D-089):** `HomePage` calls `apiClient.post('/auth/lookup-email')` to branch into
exactly two steps: `signIn` (an existing account with a password already set) or `verify` — every
other case (a brand-new email, or an existing federated-only account with no password yet) lands on
the same `verify` step, which mounts the shared `VerifyAndSetPasswordForm`
(`src/features/auth/README.md`). That component sends the OTP itself, collects the code and posts
`POST /auth/link/verify-otp` (backend `ConfirmSignUp` — must succeed before advancing), then
collects the password (create + confirm, two separate screens) and posts `POST /auth/link/confirm`
— `heediq-api` handles `AdminSetUserPassword` + `AdminLinkProviderForUser` server-side, transparently
to the caller. There is
no separate native-signup code path anymore — a first-time email and a "prove you own this email
before we link it to your Google account" email go through the identical UI and backend calls, which
is exactly what closed the bug D-089 was written to fix (an unverified direct-to-password prompt with
no code step). On success, `HomePage` calls `signInWithPassword()`, which calls `cognito-idp.ts`
directly, converts the resulting camelCase tokens to the snake_case `TokenResponse` shape, and calls
`applyTokens()` — the one path that mutates the current session. SSO users go through `startLogin()`
→ Hosted UI → `/auth/callback` → `exchangeCodeForTokens()` → `applyTokens()`.

**Proactive password set (D-089, D-091):** `SettingsPage` mounts the same
`VerifyAndSetPasswordForm` inline (email read from `GET /me`) when the caller has no `COGNITO`
method active yet (per the `GET /auth/methods` active-methods list, D-091). `onSuccess` here
invalidates the methods query rather than signing in, since the user is already authenticated.

**Proactive provider linking (D-079, D-083):** from `SettingsPage`, `startProviderLink(provider)`
starts a *second*, independent PKCE round trip (its own `heediq.pkce.link.*` sessionStorage keys) with
Cognito's `identity_provider` query param, redirecting to `/settings/link-callback` instead of
`/auth/callback`. `SettingsLinkCallbackPage` calls `exchangeLinkCodeForTokens()` — **this result is
never passed to `applyTokens`**, since it represents the just-authenticated federated identity, not
the current user's session. It decodes the returned ID token's `identities` claim (a JSON string
Cognito attaches to federated sign-ins) to get `{ userId, providerName }`, then calls the backend
`POST /settings/link/add-provider` (`heediq-api/src/routes/settings.ts` — self-service, not gated by
`requirePermission` since it only ever acts on the caller's own account per D-107, writes an
`auth:link-provider` audit event) so the server can call `AdminLinkProviderForUser` with IAM
credentials the browser never holds.

## Contracts
- Cognito IdP JSON API: see `cognito-idp.ts` — request/response shapes documented inline per
  function; errors are `{ __type, message }`.
- `identities` ID-token claim (Cognito-attached on federated sign-in): JSON-stringified array of
  `{ userId, providerName, providerType, issuer, primary, dateCreated }`. Only `identities[0]` is
  used — a fresh federated round trip yields exactly one.
- Backend calls made from this module and `src/features/auth/`: `POST /auth/lookup-email`,
  `POST /auth/link/request-otp`, `POST /auth/link/verify-otp`, `POST /auth/link/confirm`,
  `POST /settings/link/add-provider`,
  `GET /auth/methods`, `GET /me` (request/response shapes owned by `heediq-api`, not duplicated
  here). These are the bare resource paths as written at each call site — `apiClient` prepends the
  real `/api/v1` prefix (D-088); this module never writes `/api/v1` itself.

## Dependencies
- **Upstream:** Cognito User Pool + App Client (`heediq-infra` `foundation-stack.ts`) — the
  `/settings/link-callback` redirect URI must be registered there (D-083) or the Hosted UI rejects
  the redirect.
- **Downstream:** `HomePage.tsx`, `SettingsPage.tsx`, `SettingsLinkCallbackPage.tsx`,
  `AuthCallbackPage.tsx`, `api-client.ts` (via `setAccessTokenGetter`),
  `src/features/auth/VerifyAndSetPasswordForm.tsx` (shares `apiClient`/`CognitoIdpError` from this
  module; see `src/features/auth/README.md`).
- **Shared surfaces:** `token-store.ts`'s session shape is relied on by every page above; changing it
  affects all of them.

## Testing
Vitest + RTL, colocated in `__tests__/`. `cognito-idp.test.ts` and `cognito-oauth.test.ts` mock
`fetch`; page-level tests (`HomePage.test.tsx`, `SettingsLinkCallbackPage.test.tsx`,
`SettingsPage.test.tsx`) mock these modules and `apiClient` rather than `fetch` directly. The shared
`VerifyAndSetPasswordForm` has its own dedicated test file
(`src/features/auth/__tests__/VerifyAndSetPasswordForm.test.tsx`) covering its phases in isolation,
so page-level tests only need to assert the handoff (email prop, `onSuccess`/`onBack` behavior), not
re-test every phase per page. Run: `npx vitest run`.

## Gotchas & Constraints
- Never call `applyTokens()` with the result of `exchangeLinkCodeForTokens()` — doing so would
  silently switch the active session to the linked-provider's federated identity instead of the
  original user.
- `decodeJwtPayload()` does not verify signatures — safe only because its output is used for display/
  derived values, never for an authorization decision (those all happen server-side on tokens Cognito
  itself validates).
- If a user cancels the IdP's native account-picker UI, the browser returns to `HomePage` via the
  back-forward cache (bfcache) rather than a fresh page load — the exact prior JS state (including a
  disabled/loading SSO button) is restored with no natural reset. `HomePage` listens for `pageshow`
  and resets `ssoProvider` whenever `event.persisted` is true, so the button becomes clickable again
  instead of staying stuck.
