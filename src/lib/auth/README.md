# Auth (heediq-web)

## Purpose
Client-direct Cognito authentication for the unified email-first sign-in/sign-up screen (D-078,
D-081) plus reactive and proactive cross-provider account linking (D-079). Per D-082, the app talks
to Cognito directly wherever Cognito's own public APIs allow it — no backend round trip for
sign-up/sign-in/password-reset — keeping the backend surface minimal.

## Key Files
- `cognito-idp.ts` — direct `fetch()` calls to Cognito's unauthenticated IdP JSON API
  (`SignUp`, `ConfirmSignUp`, `ResendConfirmationCode`, `InitiateAuth` (`USER_PASSWORD_AUTH`),
  `ForgotPassword`, `ConfirmForgotPassword`). No SDK, no IAM credentials — only the User Pool Client
  ID is needed. Throws `CognitoIdpError` with the bare exception name (namespaced `__type` split on
  `#`) so callers can map it to a user-facing message.
- `cognito-oauth.ts` — the Hosted-UI PKCE OAuth round trips: `startLogin()`/`exchangeCodeForTokens()`
  for normal login (`/auth/callback`), `startProviderLink()`/`exchangeLinkCodeForTokens()` for
  proactive provider linking (`/settings/link-callback`, D-083), plus `refreshTokens()` and
  `logoutUrl()`.
- `pkce.ts` — PKCE verifier/challenge/state generation on Web Crypto, no external PKCE library.
- `jwt.ts` — `decodeJwtPayload()`, a hand-written base64url JSON decode (no `jwt-decode` dependency,
  consistent with the "no new dependency" approach used throughout this module). Signature is never
  verified client-side — only used to read claims for display/derived values, never for
  authorization.
- `token-store.ts` — in-memory access/ID token (never persisted) + `localStorage`-persisted refresh
  token, so a page reload doesn't force a full Hosted-UI redirect.
- `AuthContext.tsx` — `useAuth()` hook exposing `status`/`login`/`logout`/`applyTokens`; the one
  place that writes to `token-store`.
- `ProtectedRoute.tsx` — redirects to `/` when `status !== 'authenticated'`.

## Data Flow / How It Works
**Normal login:** `HomePage` calls `apiClient.post('/auth/lookup-email')` to branch into sign-up,
sign-in, or (if `passwordSet: false`) the federated-linking-via-forgot-password flow. Successful
sign-in/sign-up calls `cognito-idp.ts` directly, converts the resulting camelCase tokens to the
snake_case `TokenResponse` shape, and calls `applyTokens()` — the one path that mutates the current
session. SSO users go through `startLogin()` → Hosted UI → `/auth/callback` →
`exchangeCodeForTokens()` → `applyTokens()`.

**Proactive provider linking (D-079, D-083):** from `SettingsPage`, `startProviderLink(provider)`
starts a *second*, independent PKCE round trip (its own `heediq.pkce.link.*` sessionStorage keys) with
Cognito's `identity_provider` query param, redirecting to `/settings/link-callback` instead of
`/auth/callback`. `SettingsLinkCallbackPage` calls `exchangeLinkCodeForTokens()` — **this result is
never passed to `applyTokens`**, since it represents the just-authenticated federated identity, not
the current user's session. It decodes the returned ID token's `identities` claim (a JSON string
Cognito attaches to federated sign-ins) to get `{ userId, providerName }`, then calls the backend
`POST /settings/link/add-provider` (not yet built — `@aws-sdk/client-cognito-identity-provider` is
now installed in `heediq-api` per D-084, see `heediq-api` README) so the server can call
`AdminLinkProviderForUser` with IAM credentials the browser never holds.

## Contracts
- Cognito IdP JSON API: see `cognito-idp.ts` — request/response shapes documented inline per
  function; errors are `{ __type, message }`.
- `identities` ID-token claim (Cognito-attached on federated sign-in): JSON-stringified array of
  `{ userId, providerName, providerType, issuer, primary, dateCreated }`. Only `identities[0]` is
  used — a fresh federated round trip yields exactly one.
- Backend calls made from this module: `POST /auth/lookup-email`, `POST /auth/link/confirm`,
  `POST /settings/link/add-provider` (request/response shapes owned by `heediq-api`, not duplicated
  here).

## Dependencies
- **Upstream:** Cognito User Pool + App Client (`heediq-infra` `foundation-stack.ts`) — the
  `/settings/link-callback` redirect URI must be registered there (D-083) or the Hosted UI rejects
  the redirect.
- **Downstream:** `HomePage.tsx`, `SettingsPage.tsx`, `SettingsLinkCallbackPage.tsx`,
  `AuthCallbackPage.tsx`, `api-client.ts` (via `setAccessTokenGetter`).
- **Shared surfaces:** `token-store.ts`'s session shape is relied on by every page above; changing it
  affects all of them.

## Testing
Vitest + RTL, colocated in `__tests__/`. `cognito-idp.test.ts` and `cognito-oauth.test.ts` mock
`fetch`; page-level tests (`HomePage.test.tsx`, `SettingsLinkCallbackPage.test.tsx`,
`SettingsPage.test.tsx`) mock these modules rather than `fetch` directly. Run: `npx vitest run`.

## Gotchas & Constraints
- Never call `applyTokens()` with the result of `exchangeLinkCodeForTokens()` — doing so would
  silently switch the active session to the linked-provider's federated identity instead of the
  original user.
- `decodeJwtPayload()` does not verify signatures — safe only because its output is used for display/
  derived values, never for an authorization decision (those all happen server-side on tokens Cognito
  itself validates).
