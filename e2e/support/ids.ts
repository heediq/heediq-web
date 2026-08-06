/**
 * Stable UUIDs/ids shared across fixtures and flows. Fixed (not random) so a flow can assert an
 * exact `sourceId`/`contextId` on a captured analytics event and match it to the entity the API
 * mock returned — the D-154 cross-service join key, exercised entirely client-side here.
 */
export const ORG_ID = '00000000-0000-4000-8000-000000000001'
export const ORG_OTHER_ID = '00000000-0000-4000-8000-0000000000ff'

export const ACCOUNT = {
  admin: 'acc-admin-0001',
  member: 'acc-member-001',
  custom: 'acc-custom-001',
  crossOrg: 'acc-crossorg-1',
} as const

export const SOURCE_ID = '00000000-0000-4000-8000-000000000010'
export const JOB_ID = '00000000-0000-4000-8000-000000000011'
export const CONTEXT_ID = '00000000-0000-4000-8000-000000000020'
export const CONVERSATION_ID = '00000000-0000-4000-8000-000000000030'
export const ROLE_ID = '00000000-0000-4000-8000-000000000040'
export const GROUP_ID = '00000000-0000-4000-8000-000000000050'
