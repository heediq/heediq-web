# Layout

## Purpose
Layout primitives that sit above `components/ui` in the kit's layering (`03-ui-kit.md` §3) and give
every authenticated screen the same mobile-first chrome and page frame. Two concerns live here:
**navigation chrome** (`AppShell` + `TopBar` + `BottomTabBar`, driven by `nav-items.ts`) and the
**page frame** (`PageContainer` + `PageHeader`) every screen wraps its content in. See D-152 (nav) and
D-153 (page frame + responsive invariant).

## Key Files
- `nav-items.ts` — the single source of truth for primary navigation: `NAV_ITEMS` (id, route, icon,
  label key, optional `permission`). Both the mobile and desktop nav render from this, so they can't
  drift. Logout/account are deliberately **not** here — they live in Settings (D-152).
- `BottomTabBar.tsx` — fixed bottom tab bar, **mobile only** (`md:hidden`), thumb-reachable and
  safe-area-padded (`pb-safe`). Renders `NAV_ITEMS` as `NavLink`s (active = `text-accent`), each gated
  by `Can` on its `permission`, ≥44px targets. Fires `nav_item_clicked` with `surface: 'bottom'`.
- `TopBar.tsx` — **mobile**: wordmark only (link to `/sources`). **Desktop** (`hidden md:flex`): the
  same `NAV_ITEMS` as horizontal links. Fires `nav_item_clicked` with `surface: 'top'`. Holds no
  logout/auth control anymore.
- `AppShell.tsx` — wraps `TopBar` + `<main className="… pb-bottom-nav md:pb-0">` + `BottomTabBar`. The
  `pb-bottom-nav` keeps the fixed mobile bar from overlapping the last content row; it's removed at `md`
  where the bar is hidden.
- `PageContainer.tsx` — the one page frame: centralises `max-width` (via `size`: prose/md/default/wide/
  full), the mobile-first gutter (`px-4 sm:px-6 lg:px-8`), and vertical rhythm (`gap`). Every authed
  screen uses it instead of a hand-rolled `mx-auto max-w-* p-*` wrapper.
- `PageHeader.tsx` — standard page title block: `h1` (the `h1` type token) + optional description +
  optional actions. Actions wrap beneath the title on narrow screens (`flex-wrap`) so a title + CTA
  never collide on mobile.
- `index.ts` — barrel for all of the above.

## Data Flow / How It Works
`AppShell` is mounted inside `ProtectedRoute` (never renders for anonymous users) around every authed
route in `App.tsx`. Nav surfaces read `NAV_ITEMS` and gate each item with `Can`; the active state comes
from `NavLink`. Screens compose `PageContainer` + `PageHeader` themselves — `AppShell` supplies only the
chrome and the full-height wrapper, not the per-page frame.

## Contracts
None (UI-only, no API/data contract). Analytics: nav clicks fire `nav_item_clicked` ({ item, surface })
via `lib/analytics` — ids/enums only (D-093).

## Dependencies
- Upstream: `components/ui` (`Logo`, `Button`), `lib/rbac/Can`, `lib/analytics` (`track`),
  `react-router-dom` (`NavLink`).
- Downstream: every screen mounted inside `AppShell`. Pages use `PageContainer` (not `min-h-screen`)
  for their frame — `AppShell` already supplies the full-height wrapper, so don't reintroduce
  `min-h-screen` in a child page or the layout double-wraps. The master/detail Context Library is the
  documented exception that owns its own full-height frame instead of `PageContainer`.
- Shared surfaces: `App.tsx` route definitions; `nav-items.ts` (consumed by both nav bars);
  `i18n` keys `nav.*`.

## Testing
`__tests__/TopBar.test.tsx`, `__tests__/BottomTabBar.test.tsx`, `__tests__/AppShell.test.tsx` assert nav
renders from `NAV_ITEMS`, permission gating, active state, and that **no logout control lives in the
nav** (logout is tested in `SettingsPage.test.tsx`). The mobile-first no-horizontal-overflow invariant
is guarded separately by the Playwright harness (`e2e/responsive.e2e.ts`, `pnpm test:responsive`).

## Gotchas & Constraints
- Add a nav destination in **one** place (`nav-items.ts`); both bars pick it up. Never add a link to
  only one bar.
- Safe-area padding needs `viewport-fit=cover` on the viewport meta (`index.html`) — without it,
  `env(safe-area-inset-*)` resolves to 0 and the bottom bar can sit under the home indicator.
- `SettingsLinkCallbackPage` (the OAuth-callback redirect) intentionally stays outside `AppShell` —
  a transient screen, not one a user lingers on.
- Uses `Button`'s `asChild` prop for link-styled buttons — see `components/ui/Button/README.md` Gotchas
  for the `Slot` single-child constraint.
