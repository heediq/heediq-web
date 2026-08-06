import type { Page } from '@playwright/test'
import type { Permission } from '@heediq/shared'
import { DEFAULT_ORG_RBAC_SEED } from '@heediq/shared'
import { ACCOUNT, ORG_ID, ORG_OTHER_ID } from './ids'

/**
 * Auth mock for the mocked-backend tier (D-155). No Cognito, no token endpoint: we mint a synthetic
 * *unsigned* ID-token JWT (`header.base64url(claims).sig`) carrying the `custom:accountId/orgId/role`
 * + `email` claims the app reads, and plant a session on `window.__E2E_SESSION__` for the VITE_E2E
 * seam (see `src/lib/auth/e2e-seam.ts`). The signature is never validated client-side — `authMiddleware`
 * is server-only and the API is mocked — so an unsigned token suffices. Same approach the analytics
 * unit tests already use (`makeIdToken`).
 */
export type Persona = 'admin' | 'member' | 'custom' | 'crossOrg'

interface PersonaProfile {
  accountId: string
  orgId: string
  role: string
  email: string
  /** Server-resolved authority the GET /me mock returns (D-102 — the app never derives it from the JWT). */
  permissions: Permission[]
}

const CUSTOM_ROLE_PERMISSIONS: Permission[] = ['sources:read', 'context:read']

export const PERSONAS: Record<Persona, PersonaProfile> = {
  admin: {
    accountId: ACCOUNT.admin,
    orgId: ORG_ID,
    role: 'admin',
    email: 'admin@e2e.test',
    permissions: [...DEFAULT_ORG_RBAC_SEED.admin.permissions],
  },
  member: {
    accountId: ACCOUNT.member,
    orgId: ORG_ID,
    role: 'member',
    email: 'member@e2e.test',
    permissions: [...DEFAULT_ORG_RBAC_SEED.member.permissions],
  },
  custom: {
    accountId: ACCOUNT.custom,
    orgId: ORG_ID,
    role: 'custom',
    email: 'custom@e2e.test',
    permissions: CUSTOM_ROLE_PERMISSIONS,
  },
  crossOrg: {
    accountId: ACCOUNT.crossOrg,
    orgId: ORG_OTHER_ID,
    role: 'admin',
    email: 'other-org@e2e.test',
    permissions: [...DEFAULT_ORG_RBAC_SEED.admin.permissions],
  },
}

function base64Url(json: object): string {
  return Buffer.from(JSON.stringify(json))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Mint the synthetic unsigned ID token for a persona (claims-only; signature is a placeholder). */
export function makeIdToken(persona: Persona): string {
  const p = PERSONAS[persona]
  const claims = {
    'custom:accountId': p.accountId,
    'custom:orgId': p.orgId,
    'custom:role': p.role,
    email: p.email,
  }
  return `e2e.${base64Url(claims)}.sig`
}

/**
 * Plant a synthetic session so the VITE_E2E seam bootstraps straight to `authenticated`. Runs as an
 * init script (before any app code) so `AuthProvider`'s mount effect finds it on first render.
 */
export async function plantSession(page: Page, persona: Persona): Promise<void> {
  const idToken = makeIdToken(persona)
  await page.addInitScript((token) => {
    ;(window as unknown as { __E2E_SESSION__?: unknown }).__E2E_SESSION__ = {
      access_token: 'e2e-access-token',
      id_token: token,
      refresh_token: 'e2e-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
    }
  }, idToken)
}
