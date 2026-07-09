import type { Org, User } from '@heediq/shared'
import type { Permission } from '@heediq/shared'

// Shape of GET /me — the single source of truth for the caller's org/user/permissions.
// effectivePermissions is server-resolved (heediq-api/src/routes/me.ts); the frontend never
// decodes the JWT itself to derive authority (D-102).
export interface GetMeResponse {
  user: User
  org: Org
  effectivePermissions: Permission[]
}
