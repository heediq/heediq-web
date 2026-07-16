# Layout

## Purpose
Layout primitives that sit above `components/ui` in the kit's layering (`03-ui-kit.md` §3) and give
every authenticated screen the same chrome: a `TopBar` (app name, Settings link, Logout) wrapped by
`AppShell`. Added to unblock manual QA — before this, `useAuth().logout()` existed but was never
wired to any button, and `/settings` (proactive provider linking, D-083) was only reachable by typing
the URL.

## Key Files
- `TopBar.tsx` — app name link (`/sources`) pairing the `Logo` kit component with the wordmark, Settings
  nav link, Logout button wired to `useAuth().logout()`.
- `AppShell.tsx` — wraps `TopBar` + a `<main>` content area around a screen's content.

## Data Flow / How It Works
`AppShell` is mounted inside `ProtectedRoute` (so it never renders for anonymous users) around
`/sources`, `/sources/:sourceId`, and `/settings` in `App.tsx`. `TopBar` reads `useAuth()` directly —
it isn't passed auth state as props.

## Contracts
None (UI-only, no API/data contract).

## Dependencies
- Upstream: `components/ui` (`Button`, `Logo`), `lib/auth/AuthContext` (`useAuth`).
- Downstream: any screen mounted inside `AppShell` — currently `SourcesLibraryPage`, `SourceDetailPage`,
  `SettingsPage`. Those pages use `flex-1` (not `min-h-screen`) for their own centering, since `AppShell`
  already supplies the full-height wrapper — don't reintroduce `min-h-screen` in a child page or the
  layout double-wraps.
- Shared surfaces: `App.tsx` route definitions.

## Testing
`__tests__/TopBar.test.tsx` and `__tests__/AppShell.test.tsx` mock `useAuth` directly (not `AuthProvider`)
to assert the Logout button calls `logout()` and the Settings link points to `/settings`. Run via the
repo's standard `pnpm run test`.

## Gotchas & Constraints
- `SettingsLinkCallbackPage` (the OAuth-callback redirect) intentionally stays outside `AppShell` — it's
  a transient screen, not one a user lingers on.
- Uses `Button`'s `asChild` prop for the Settings link — see `components/ui/Button/README.md` Gotchas
  for the `Slot` single-child constraint this surfaced.
