import { OrgSchema, UserSchema, PermissionSchema } from '@heediq/shared'
import type { GetMeResponse } from '../../src/lib/rbac/types'
import { PERSONAS, type Persona } from '../support/auth'

/**
 * GET /me fixture (the authority source of truth — D-102). Org/user/permissions are each parsed
 * through the real `@heediq/shared` schemas so a drifted shape fails at load, and `effectivePermissions`
 * comes from the persona profile — this is what drives the `Can` gate in the RBAC flow, never the JWT.
 */
export function meResponse(persona: Persona): GetMeResponse {
  const p = PERSONAS[persona]
  const org = OrgSchema.parse({
    orgId: p.orgId,
    name: 'E2E Org',
    plan: 'paid',
    seatCount: 5,
    usageLifetimeCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  })
  const user = UserSchema.parse({
    userId: p.accountId,
    orgId: p.orgId,
    email: p.email,
    role: p.role === 'admin' ? 'admin' : 'member',
    passwordSet: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  })
  const effectivePermissions = p.permissions.map((perm) => PermissionSchema.parse(perm))
  return { user, org, effectivePermissions }
}
