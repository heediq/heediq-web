# heediq-web

## Purpose
The Heediq frontend: a Vite + React + TypeScript PWA. Auth, home/Listen, sources library, and
source detail/summary screens, built on a locally-owned UI kit (`03-ui-kit.md`) so every screen is
assembled from shared, tokenized components rather than bespoke styling per screen. Mobile-first,
installable, offline-capable (D-024).

## Key Files
- `src/App.tsx` — route table (`/`, `/auth/callback`, `/sources`, `/sources/:sourceId`, and
  `/dev/ui` gated behind `import.meta.env.DEV`) wrapped in `QueryClientProvider` + `BrowserRouter`.
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
  (`heediq-loader-*`, D-074) once globally, copied verbatim from
  `design_handoff_heediq_brand/Heediq Style Guide.dc.html`.
- `tailwind.config.ts` — maps Tailwind theme (`colors`, `fontFamily`, `fontSize`, `spacing`,
  `borderRadius`) onto the CSS custom properties in `tokens.css`. Never hardcode a color/space/type
  value outside this file — extend the token set instead.
- `src/lib/api-client.ts` — `fetch` wrapper reading `VITE_API_BASE_URL`/`VITE_WS_BASE_URL` from
  `import.meta.env`; `setAccessTokenGetter()` lets the auth layer inject a JWT getter (read fresh
  per call, not cached at module scope) that's added as `Authorization: Bearer <token>`.
- `src/lib/query-client.ts` — shared TanStack Query client (server state; see `07-engineering-standards.md` §7).
- `src/lib/cn.ts` — `clsx` + `tailwind-merge` className helper used by every kit component.
- `src/components/ui/` — the UI kit: `Button`, `Spinner`, `Card`, `Badge` (D-072), `LoadingMark`
  (D-074) so far. Each has its own `README.md` (props/variants/states/usage) per `03-ui-kit.md` §9.
- `public/brand/` — final logo assets (`heediq-logo.png`, `heediq-badge-bg.svg`,
  `heediq-stubs.svg`), copied verbatim from `design_handoff_heediq_brand/assets/` per D-073.
- `src/routes/` — screen-level route components. Currently placeholders (`HomePage`,
  `AuthCallbackPage`, `SourcesLibraryPage`, `SourceDetailPage`) pending the auth/Listen/library/
  detail build-out.
- `src/routes/DevUiGalleryPage.tsx` — living component gallery (`03-ui-kit.md` §8), only mounted
  in dev builds.

## Data Flow / How It Works
- Server state (API reads/writes) goes through TanStack Query via `apiClient` in `src/lib/api-client.ts`.
- Client/UI state stays local to components — no separate global store yet; add one only when a
  concrete cross-screen UI-state need appears.
- Auth: Cognito + Google/Microsoft federated IdPs (D-020). `AuthCallbackPage` will exchange the
  IdP redirect for a JWT and register it with `setAccessTokenGetter()`; not yet implemented.

## Contracts
- **Env vars** (build-time, inlined by Vite — see Gotchas): `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`.
  See `.env.example` for local values; CI resolves per-environment values from SSM (see Deploy).
- **Shared types**: `@heediq/shared` is the single source of truth for API/DB shapes shared with the
  backend (`07-engineering-standards.md` §1). Don't redefine a backend contract type locally.
- **i18n coverage (D-075/D-076)**: every user-facing string — labels, copy, empty/error states,
  toasts, and thrown error messages — is a translation key resolved through `t()`
  (`useTranslation` in components; the exported `i18n` instance in plain modules), never a
  hardcoded literal in JSX/TS. Add new copy to `src/i18n/locales/en/translation.json`, not inline.

## Dependencies
- **Upstream**: `heediq-api` (REST + WebSocket endpoints), `@heediq/shared` (types), Cognito (auth),
  `heediq-infra` (S3 web-assets bucket + CloudFront distribution + SSM params the deploy pipeline reads).
- **Downstream**: none yet (this is the frontend leaf).
- **Shared surfaces**: `@heediq/shared` version bumps; design tokens (`tokens.css`) if D-008 changes.

## Testing
- Vitest + React Testing Library (D-030). `pnpm run test` (single run), `pnpm run test:watch`.
- `pnpm run test:pre-pr` = typecheck + test — the pre-PR gate (`05-testing.md`).
- Component tests cover all declared states (default/hover/focus/disabled/loading/error) per kit
  component: `Button.test.tsx`, `Spinner.test.tsx`, `Card.test.tsx`, `Badge.test.tsx`,
  `LoadingMark.test.tsx`.
- No integration/E2E suites yet — add Playwright E2E once auth + at least one real data screen exist.

## Local dev setup
1. `pnpm install` (requires `NODE_AUTH_TOKEN` — a GitHub PAT with `read:packages` — to pull
   `@heediq/shared` from GitHub Packages; see `.npmrc`).
2. Copy `.env.example` to `.env` and adjust if not pointing at the dev API.
3. `pnpm run dev`.
4. `pnpm run test:pre-pr` before pushing.

## Deploy
CI/CD via GitHub Actions (`.github/workflows/deploy.yml`), OIDC role assumption per account
(D-043) — no stored AWS credentials.

**Unlike the Lambda/Docker repos, this cannot build once and promote by tag.** `VITE_*` env vars
are inlined into the JS bundle at build time, so each environment gets its own build: the deploy
job for each environment reads that environment's `/heediq/api/endpoint-url` and
`/heediq/api/ws-endpoint-url` from SSM, injects them as `VITE_API_BASE_URL`/`VITE_WS_BASE_URL`,
runs `pnpm run build`, syncs `dist/` to that environment's web-assets bucket
(`/heediq/api/web-assets-bucket-name`), and invalidates that environment's CloudFront distribution
(`/heediq/web/cloudfront-distribution-id`).

- `develop` push → deploy-dev (account `276594885933`)
- `main` push → deploy-staging (account `475790160542`) → deploy-prod (account `438825592314`,
  gated by the `production` GitHub Environment's manual approval)

## Gotchas & Constraints
- **Vite env vars are build-time, not runtime.** Never assume `VITE_*` can be swapped after build —
  a bad value means a full rebuild + redeploy for that environment, not a config change.
- **Tailwind `dark:` variant does not reliably apply exact colors for color-critical components in
  practice** — use the CSS-custom-property token classes (`bg-surface-0`, `text-accent`, etc.) wired
  through `tailwind.config.ts`, not ad-hoc `dark:` utilities (see `branding.md`).
- **No bespoke styling in feature/route code** (`03-ui-kit.md` golden rule) — if a screen needs a
  visual element the kit doesn't have, add it to `src/components/ui/` first.
- **`api-client.ts` calls `i18n.t()` directly, not the `useTranslation` hook** — it runs outside the
  React tree, so it can't subscribe to a hook. This only re-renders correctly on language change
  inside components; a language switch won't retroactively translate an already-thrown error, which
  is fine since errors are ephemeral. `src/i18n/config.ts` initializes synchronously specifically so
  this direct `t()` call always has resources loaded, with no async gap to guard against.
- **`DevUiGalleryPage` example content (e.g. "Weekly sync — Jul 2") is intentionally left as literal
  English**, not translation keys — it's a dev-only tool gated behind `import.meta.env.DEV` and never
  ships to real users, so it's outside D-075's user-facing-text scope.
