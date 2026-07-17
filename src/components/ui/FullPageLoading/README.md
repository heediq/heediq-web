# FullPageLoading

## Purpose
Canonical full-viewport loading screen for route-level waits (auth status resolving, OAuth
callback exchange) — the single definition of the `min-h-screen` centered `LoadingMark` pattern
that was previously copy-pasted per page (`ProtectedRoute`, `HomePage`, `AuthCallbackPage`,
`SettingsLinkCallbackPage`). Callers gate its visibility through `usePerceivedLoading`
(`src/lib/usePerceivedLoading.ts`, D-122) rather than rendering it directly off a raw async flag,
so a route wait that resolves in under 150ms never flashes it at all, and one that does show it
stays up at least 600ms.

## Props / variants
- `aria-label` (required): context-specific announcement, e.g. "Checking session…", "Signing in…".
No size/tone variants — always `LoadingMark size="lg"`, centered full-viewport.

## States
Single state (always loading while mounted); animation/reduced-motion handled by `LoadingMark`.

## Usage
```tsx
const showLoading = usePerceivedLoading(status === 'loading', { delay: 150, minDuration: 600 })
if (showLoading) return <FullPageLoading aria-label={t('common.checkingSession')} />
```
