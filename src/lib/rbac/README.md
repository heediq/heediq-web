# RBAC (frontend)

## Purpose
Permission-aware UI wrappers for D-102/D-105. `GET /me`'s `effectivePermissions` field (resolved
server-side from the caller's JWT `custom:permissions` claim) is the **only** source of authority
here — this module never decodes the JWT itself.

## Key Files
- `types.ts` — `GetMeResponse`, the shared shape of `GET /me` (also used by `SettingsPage`, same
  `['me']` query cache).
- `usePermissions.ts` — TanStack Query hook (`queryKey: ['me']`) exposing `{ permissions, isLoading,
  has(permission) }`.
- `Can.tsx` — `<Can permission="org:manage-roles">…</Can>` — renders children only if the caller has
  the permission; renders `fallback` (default `null`) otherwise, and `null` while loading (avoids a
  flash of a disallowed action).

## Contracts
- UX-only gate. The real authorization boundary is always server-side (`requirePermission()` in
  `heediq-api`). Hiding/disabling a control here never substitutes for the server check.

## Dependencies
- Upstream: `GET /me` (`heediq-api/src/routes/me.ts`).
- Downstream: any screen/nav item that conditionally shows an action based on permission (currently
  the Settings → Roles & Permissions nav entry and the Roles/Groups management screens).

## Testing
`usePermissions.test.tsx`, `Can.test.tsx` — mock `apiClient` at the module boundary, assert
loading/allow/deny rendering.
