# heediq-web

## Purpose
The Heediq frontend: a Vite + React + TypeScript PWA. Auth, home/Listen, sources library, and
source detail/summary screens, built on a locally-owned UI kit (`03-ui-kit.md`) so every screen is
assembled from shared, tokenized components rather than bespoke styling per screen. Mobile-first,
installable, offline-capable (D-024).

## Key Files
- `src/App.tsx` — route table (`/`, `/auth/callback`, `/sources`, `/sources/:sourceId`,
  `/contexts` + `/contexts/:contextId` (Context Library, gated by `<Can permission="context:read">`),
  `/settings`, `/settings/roles` (gated by `<Can permission="org:manage-roles">`, D-102 Phase 4),
  `/org/audit-log` (gated by `<Can permission="audit:read">`, D-102 Phase 5),
  `/settings/link-callback`, and `/dev/ui` gated behind `import.meta.env.DEV`) wrapped in
  `QueryClientProvider` + `BrowserRouter`.
- `src/features/contexts/` — the Context Library UI (tree/library + detail + create). See
  `src/features/contexts/README.md`. Route component `src/routes/ContextLibraryPage.tsx`.
- `src/features/sources/` — Source detail read side: Summary (transcript + gist) + curated
  `ExtractedItem`s grouped by category, plus the Review entry point. See
  `src/features/sources/README.md`. Route component `src/routes/SourceDetailPage.tsx`.
- `src/main.tsx` — React root, imports `src/i18n/config` and `src/styles/globals.css`.
- `src/i18n/config.ts` — initializes `react-i18next`/`i18next` synchronously with bundled resources
  (`initAsync: false`) so `t()` works both inside components (`useTranslation`) and in plain modules
  (`api-client.ts`) with no loading gap. D-075/D-076.
- `src/i18n/locales/en/translation.json` — the single default namespace; all keys nested by
  screen/module (`home.*`, `sourcesLibrary.*`, `errors.*`, `common.*`). Split into per-feature
  namespaces only if this file grows unwieldy.
- `src/styles/tokens.css` — CSS custom properties for the D-008 design tokens (colors, exact hex
  values) plus the D-072 status/semantic tokens (`success`, `danger`, `accent-bg`/`accent-border`
  for in-progress states). No `warning`/`info` tokens — no design currently calls for them.
- `src/styles/globals.css` — also defines the `LoadingMark` component's keyframes/classes
  (`heediq-loader-*`, D-074/D-116 — an audio-waveform bar pulse, `heediqWave` keyframe) once
  globally; SVG bar geometry is copied verbatim from
  `design_handoff_heediq_brand/Heediq Style Guide.dc.html`, animation redesigned per D-116.
- `src/lib/motion.ts` — shared Framer Motion tokens/variants (D-117): durations, easing, and
  `pageVariants`/`fadeUpVariants`/`fadeXVariants`/`fadeVariants`/`scaleFadeVariants`/`toastVariants`.
  Every mount/unmount animation (page transitions in `App.tsx`, `Modal`, `Toast`, `HomePage`'s
  step swaps) draws from this one file — never a bespoke `motion.div` transition inline.
- `tailwind.config.ts` — maps Tailwind theme (`colors`, `fontFamily`, `fontSize`, `spacing`,
  `borderRadius`) onto the CSS custom properties in `tokens.css`. Never hardcode a color/space/type
  value outside this file — extend the token set instead.
- `src/lib/api-client.ts` — `fetch` wrapper reading `VITE_API_BASE_URL`/`VITE_WS_BASE_URL` from
  `import.meta.env`; `setAccessTokenGetter()` lets the auth layer inject a JWT getter (read fresh
  per call, not cached at module scope) that's added as `Authorization: Bearer <token>`. Unwraps
  the `{ ok, data }` / `{ ok, error }` API envelope (`@heediq/shared`'s `ApiResponse<T>`).
  **Owns the `/api/v1` version prefix (D-088)** — callers pass a bare resource path
  (`apiClient.post('/auth/lookup-email', ...)`), never the prefix; `request()` prepends it exactly
  once. `VITE_API_BASE_URL`/the `/heediq/api/endpoint-url` SSM param stay version-free (bare origin)
  on purpose, so the API's version can change independently of the domain.
- `src/lib/query-client.ts` — shared TanStack Query client (server state; see `07-engineering-standards.md` §7).
- `src/lib/cn.ts` — `clsx` + `tailwind-merge` className helper used by every kit component.
- `src/lib/auth/` — full client-direct Cognito auth module (email-first sign-in/sign-up, D-078;
  Hosted UI SSO; reactive + proactive cross-provider linking, D-079/D-083/D-087/D-089). See
  `src/lib/auth/README.md` for the complete file list, data flow, and contracts — not duplicated
  here; the highlights: `cognito-idp.ts` (direct Cognito IdP API calls), `cognito-oauth.ts`
  (Hosted UI PKCE), `jwt.ts` (claims decode, never signature-verified client-side), `pkce.ts`,
  `token-store.ts`, `AuthContext.tsx`, `ProtectedRoute.tsx`.
- `src/features/auth/VerifyAndSetPasswordForm.tsx` — the one shared own-verification +
  set-password component (D-089), reused by `HomePage` (reactive linking + native signup) and
  `SettingsPage` (proactive "add a sign-in method"). See `src/features/auth/README.md`.
- `src/components/ui/` — the UI kit: `Button`, `Spinner`, `Card`, `Badge` (D-072), `LoadingMark`
  (D-074/D-116), `ErrorState`, `EmptyState`, `Skeleton`, `Tree` (Context Library slice A — designed
  empty branch / layout-preserving loading placeholder / keyboard-operable ARIA tree for the
  self-nesting Context hierarchy), `Input`, `Table`, `Modal`, `Checkbox`, `Select`, `Toast` (D-102 Phase 4 —
  `Table`/`Modal`/`Checkbox`/`Select` are Radix-based primitives added for the Roles/Groups/Users
  screens; `Toast` is the centralized success/error outcome-feedback primitive, `04-loading-and-feedback.md`
  §7), `IdentityProviderButton` (D-118 — separate branded Google/Microsoft sign-in buttons that go
  direct-to-provider via Cognito's `identity_provider` param, instead of a shared "Continue with SSO"
  button routing through Cognito's own generic IdP picker). Each has its own `README.md`
  (props/variants/states/usage) per `03-ui-kit.md` §9. `Modal` and `Toast` animate mount/unmount via
  the shared motion system (`src/lib/motion.ts`, D-117).
- `src/lib/rbac/` — `usePermissions` (TanStack Query hook over `GET /me`'s `effectivePermissions`)
  and `<Can permission="...">` (UX-only conditional render; the real authorization boundary is
  always server-side, D-102/D-105). See `src/lib/rbac/README.md`.
- `src/features/rbac/` — `RoleForm`/`GroupForm` (create/edit forms used inside `Modal`),
  `RolesPanel`/`GroupsPanel`/`UsersPanel` (the three `RolesSettingsPage` tabs — CRUD tables +
  mutations with success/error toasts, no optimistic UI since role/permission changes are
  security-relevant), `AssignmentsModal` (per-user role/group assignment list + assign/remove,
  fetched lazily via `enabled: open && !!user` to avoid an N+1 upfront fetch across all users).
- `src/routes/RolesSettingsPage.tsx` — thin tabbed shell (Roles / Groups / Users) composing the
  `src/features/rbac/` panels; route is `/settings/roles`.
- `src/routes/AuditLogPage.tsx` — D-102 Phase 5 audit-log viewer: filterable (actor/action/resource
  type/date range), cursor-paginated table over `GET /org/audit-log`; accumulates pages into local
  state via a `useEffect` on `query.data` rather than `useQuery`'s `onSuccess` (removed in TanStack
  Query v5). Route is `/org/audit-log`, gated by `<Can permission="audit:read">`; entry point is a
  card on `SettingsPage` shown only when the permission is present.
- `public/brand/` — final logo assets (`heediq-logo.png`, `heediq-badge-bg.svg`,
  `heediq-stubs.svg`), copied verbatim from `design_handoff_heediq_brand/assets/` per D-073.
- `public/icons/`, `public/favicon.ico` — the full favicon/PWA icon set (favicons, apple-touch,
  android/maskable, mstile), copied from the workspace-root `icons/` folder (D-119); referenced by
  both `index.html`'s `<link>` tags and `vite.config.ts`'s PWA manifest.
- `src/routes/` — screen-level route components. `HomePage` (unified email-first sign-in/sign-up +
  cross-provider linking entry point, D-078/D-087), `AuthCallbackPage` (PKCE code exchange,
  loading/error branches), `SettingsPage`/`SettingsLinkCallbackPage` (proactive provider linking,
  D-083) are wired up. `SourceDetailPage` is built (Context Library slice B — Summary + curated
  ExtractedItems, `src/features/sources/`); `SourcesLibraryPage` (the sources *list*) is still a
  placeholder behind `ProtectedRoute`.
- `src/routes/DevUiGalleryPage.tsx` — living component gallery (`03-ui-kit.md` §8), only mounted
  in dev builds.
- `src/lib/pwa/` — `useInstallPrompt()`, capturing the browser's `beforeinstallprompt` event so the
  Settings "Install app" card can trigger it on demand (D-119). See `src/lib/pwa/README.md`.

## Data Flow / How It Works
- Server state (API reads/writes) goes through TanStack Query via `apiClient` in `src/lib/api-client.ts`.
- Client/UI state stays local to components — no separate global store yet; add one only when a
  concrete cross-screen UI-state need appears.
- **Auth (D-020, D-077, D-078–D-091)**: `HomePage` is the unified email-first sign-in/sign-up
  entry point — full flow (native sign-in, SSO via Hosted UI, own-verification + set-password) is
  documented in `src/lib/auth/README.md`, not duplicated here. A brand-new email and an existing
  federated-only email both land on the same shared `VerifyAndSetPasswordForm` (D-089,
  `src/features/auth/README.md`) — there is no separate sign-up form. SSO redirects go through
  `/auth/callback` (PKCE code exchange, `AuthCallbackPage`); proactive provider linking/password-set
  from `SettingsPage` reuses the same shared component inline, plus `/settings/link-callback`
  (`SettingsLinkCallbackPage`) for OAuth-based provider linking. On every reload, `AuthProvider`
  silently calls `refreshTokens()` with the persisted refresh token before deciding
  `authenticated`/`anonymous` — no separate onboarding/org-creation step is needed client-side:
  `custom:orgId`/`custom:role` land in the token from `heediq-api`'s PreTokenGeneration trigger
  (D-077, D-090), and `GET /me` works immediately after the first token exchange.
- `ProtectedRoute` gates `/sources` and `/sources/:sourceId`; unauthenticated visits redirect to `/`.
- **Motion (D-117)**: `App.tsx`'s `AnimatedRoutes` wraps the route table in Framer Motion's
  `AnimatePresence` (keyed on `location.pathname`) for a fade + y-axis page-to-page transition. Any
  UI element that mounts/unmounts (Modal, Toast, HomePage's step swaps) animates via the same shared
  variants in `src/lib/motion.ts` — fade + axis-shift, `prefers-reduced-motion` honored throughout
  (`useReducedMotion()` short-circuits to a static render).
- **PWA (D-119)**: `vite-plugin-pwa` (`vite.config.ts`) precaches the app shell and registers a
  service worker (`registerType: 'autoUpdate'`); API responses are never cached. `useInstallPrompt`
  (`src/lib/pwa/`) surfaces install status/action to the Settings screen. Offline recording, queued
  upload, and Wake Lock are backlog items, not built yet.

## Contracts
- **Env vars** (build-time, inlined by Vite — see Gotchas): `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`,
  `VITE_COGNITO_DOMAIN` (Hosted UI base URL), `VITE_COGNITO_CLIENT_ID` (public PKCE client, no
  secret), `VITE_COGNITO_REGION` (region for direct Cognito IdP JSON API calls — `cognito-idp.ts`,
  D-082; not derivable from `VITE_COGNITO_DOMAIN`, which may be a custom domain in prod; set in CI
  from `vars.AWS_REGION`, not SSM, since it's the same region the deploy role/CDK stack use). See
  `.env.example` for local values; CI resolves per-environment values from SSM (see Deploy).
  `VITE_WS_BASE_URL` is consumed by `src/lib/ws/WsProvider.tsx` (D-110; see `src/lib/ws/README.md`).
- **Shared types**: `@heediq/shared` is the single source of truth for API/DB shapes shared with the
  backend (`07-engineering-standards.md` §1). Don't redefine a backend contract type locally.
- **Auth callback contract**: redirect URI is always `<origin>/auth/callback`; the Hosted UI client
  is registered (in `heediq-infra`) with both the deployed origin and `http://localhost:5173` for
  local dev. PKCE verifier/state are held in `sessionStorage` only for the duration of the redirect
  round trip and are deleted on the first callback attempt (success or failure) — a callback can
  never be replayed.
- **i18n coverage (D-075/D-076)**: every user-facing string — labels, copy, empty/error states,
  toasts, and thrown error messages — is a translation key resolved through `t()`
  (`useTranslation` in components; the exported `i18n` instance in plain modules), never a
  hardcoded literal in JSX/TS. Add new copy to `src/i18n/locales/en/translation.json`, not inline.

## Dependencies
- **Upstream**: `heediq-api` (REST endpoints, incl. `GET /me`'s `effectivePermissions` and
  `GET /api/v1/users`, D-102 Phase 4, plus the PreTokenGeneration trigger, D-077),
  `@heediq/shared` (types, incl. `Role`/`Group`/`RoleAssignment`/`Permission`/`PERMISSIONS`,
  D-102), Cognito Hosted UI (auth, `heediq-infra`'s `FoundationStack`),
  `heediq-infra` (S3 web-assets bucket + CloudFront distribution + SSM params the deploy pipeline
  reads, incl. `/heediq/api/cognito-hosted-ui-domain` and `/heediq/api/cognito-client-id`).
  `heediq-infra`'s WebSocket API (`WebSocketStack`) — connected to via `src/lib/ws/WsProvider.tsx`
  (D-110; see `src/lib/ws/README.md`). No feature consumes a pushed event yet (`SourcesLibraryPage`/
  `SourceDetailPage` are still stubs, D-069 build order) but the client transport is live.
  `@heediq/shared` `^0.15.3` (Context Library, ContextGrant, and chat contracts).
- **Downstream**: none yet (this is the frontend leaf).
- **Shared surfaces**: `@heediq/shared` version bumps; design tokens (`tokens.css`) if D-008 changes.

## Testing
- Vitest + React Testing Library (D-030). `pnpm run test` (single run), `pnpm run test:watch`.
- `pnpm run test:pre-pr` = typecheck + test — the pre-PR gate (`05-testing.md`).
- Component tests cover all declared states (default/hover/focus/disabled/loading/error) per kit
  component: `Button.test.tsx`, `Spinner.test.tsx`, `Card.test.tsx`, `Badge.test.tsx`,
  `LoadingMark.test.tsx`, `ErrorState.test.tsx`, `Input.test.tsx`, `Table.test.tsx`, `Modal.test.tsx`
  (via composition in component tests), `Checkbox.test.tsx`, `Select.test.tsx`, `Toast.test.tsx`,
  `IdentityProviderButton.test.tsx`. `Toast.test.tsx` mocks `framer-motion` to a plain passthrough,
  since fake timers don't deterministically resolve a real rAF-driven exit transition — the
  dismiss/auto-dismiss assertions test toast state, not animation timing.
- RBAC tests (D-102 Phase 4): `lib/rbac/__tests__/usePermissions.test.tsx`, `Can.test.tsx`;
  `features/rbac/__tests__/RoleForm.test.tsx`, `GroupForm.test.tsx`, `RolesPanel.test.tsx`,
  `GroupsPanel.test.tsx`, `UsersPanel.test.tsx`, `AssignmentsModal.test.tsx`;
  `routes/__tests__/RolesSettingsPage.test.tsx` (tab switching);
  `i18n/__tests__/permission-coverage.test.ts` — asserts every `PERMISSIONS` entry (`@heediq/shared`)
  has a matching `rolesSettings.permissions` i18n key, catching silent drift between the permission
  constant and its label.
- Auth flow unit tests (see `src/lib/auth/README.md` for the full breakdown): `pkce.test.ts`,
  `cognito-oauth.test.ts`, `cognito-idp.test.ts`, `jwt.test.ts`, `token-store.test.ts`,
  `AuthContext.test.tsx`, `ProtectedRoute.test.tsx`, and `routes/__tests__/HomePage.test.tsx`/
  `AuthCallbackPage.test.tsx`/`SettingsPage.test.tsx`/`SettingsLinkCallbackPage.test.tsx` (all with
  `cognito-idp`/`cognito-oauth`/`api-client` mocked at the module boundary — no real network/Cognito
  calls). `src/features/auth/__tests__/VerifyAndSetPasswordForm.test.tsx` covers the shared
  own-verification + set-password component in isolation (all its phases/states) — see
  `src/features/auth/README.md`.
- `src/lib/__tests__/api-client.test.ts` (D-088) — asserts the `/api/v1` prefix is applied to every
  request; regression test for the production 404 that motivated D-088.
- `src/lib/ws/__tests__/WsProvider.test.tsx` (D-110) — see `src/lib/ws/README.md` for the breakdown
  (connect/reconnect/backoff/dispatch, against a hand-rolled `FakeWebSocket`).
- `src/lib/pwa/__tests__/useInstallPrompt.test.ts` — dispatches synthetic `beforeinstallprompt`/
  `appinstalled` events; see `src/lib/pwa/README.md`.
- Context Library (slice A): `components/ui/{Tree,EmptyState,Skeleton}` kit tests;
  `features/contexts/__tests__/CreateContextModal.test.tsx`;
  `routes/__tests__/ContextLibraryPage.test.tsx` (tree/empty/error/select-navigate/deep-link).
- Source detail (slice B): `features/sources/__tests__/ExtractedItemsList.test.tsx`;
  `routes/__tests__/SourceDetailPage.test.tsx` (render / review-nav / 404-summary / empty / error).
- 55 test files / 242 tests total (`pnpm run test`).
- No integration/E2E suites yet — add Playwright E2E once at least one real data screen exists
  behind auth.

## Local dev setup
1. `pnpm install` (requires `NODE_AUTH_TOKEN` — a GitHub PAT with `read:packages` — to pull
   `@heediq/shared` from GitHub Packages; see `.npmrc`).
2. Copy `.env.example` to `.env` and adjust if not pointing at the dev API/Cognito Hosted UI
   (`VITE_COGNITO_DOMAIN`/`VITE_COGNITO_CLIENT_ID` — read the dev values with
   `aws ssm get-parameter --name /heediq/api/cognito-hosted-ui-domain` /
   `--name /heediq/api/cognito-client-id`).
3. `pnpm run dev`.
4. `pnpm run test:pre-pr` before pushing.

## Deploy
CI/CD via GitHub Actions (`.github/workflows/deploy.yml`), OIDC role assumption per account
(D-043) — no stored AWS credentials.

**Unlike the Lambda/Docker repos, this cannot build once and promote by tag.** `VITE_*` env vars
are inlined into the JS bundle at build time, so each environment gets its own build: the deploy
job for each environment reads that environment's `/heediq/api/endpoint-url`,
`/heediq/api/ws-endpoint-url`, `/heediq/api/cognito-hosted-ui-domain`, and
`/heediq/api/cognito-client-id` from SSM, injects them as `VITE_API_BASE_URL`/`VITE_WS_BASE_URL`/
`VITE_COGNITO_DOMAIN`/`VITE_COGNITO_CLIENT_ID`, runs `pnpm run build`, syncs `dist/` to that
environment's web-assets bucket (`/heediq/api/web-assets-bucket-name`), and invalidates that
environment's CloudFront distribution (`/heediq/web/cloudfront-distribution-id`).

- `develop` push → deploy-dev (account `276594885933`)
- `main` push → deploy-staging (account `475790160542`) → deploy-prod (account `438825592314`,
  gated by the `production` GitHub Environment's manual approval)

## Gotchas & Constraints
- **Vite env vars are build-time, not runtime.** Never assume `VITE_*` can be swapped after build —
  a bad value means a full rebuild + redeploy for that environment, not a config change.
- **Tailwind `dark:` variant does not reliably apply exact colors for color-critical components in
  practice** — use the CSS-custom-property token classes (`bg-surface-0`, `text-accent`, etc.) wired
  through `tailwind.config.ts`, not ad-hoc `dark:` utilities (see `branding.md`).
- **`api-client.ts` calls `i18n.t()` directly, not the `useTranslation` hook** — it runs outside the
  React tree, so it can't subscribe to a hook. This only re-renders correctly on language change
  inside components; a language switch won't retroactively translate an already-thrown error, which
  is fine since errors are ephemeral. `src/i18n/config.ts` initializes synchronously specifically so
  this direct `t()` call always has resources loaded, with no async gap to guard against.
- **`DevUiGalleryPage` example content (e.g. "Weekly sync — Jul 2") is intentionally left as literal
  English**, not translation keys — it's a dev-only tool gated behind `import.meta.env.DEV` and never
  ships to real users, so it's outside D-075's user-facing-text scope.
