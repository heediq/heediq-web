import { describe, it, expect, afterEach, vi } from 'vitest'
import type { TokenResponse } from '../cognito-oauth'

const SESSION: TokenResponse = {
  access_token: 'a',
  id_token: 'header.payload.sig',
  refresh_token: 'r',
  token_type: 'Bearer',
  expires_in: 3600,
}

async function freshSeam() {
  vi.resetModules()
  return import('../e2e-seam')
}

describe('readE2eSession (D-155 seam gating)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as unknown as { __E2E_SESSION__?: TokenResponse }).__E2E_SESSION__
  })

  // The load-bearing guarantee: a real build (VITE_E2E unset) must NEVER adopt an injected
  // session, even if something plants one on window. This is the "seam absent in non-E2E builds"
  // assertion D-155 requires.
  it('returns null when VITE_E2E is unset, even with a session planted on window', async () => {
    ;(window as unknown as { __E2E_SESSION__?: TokenResponse }).__E2E_SESSION__ = SESSION
    const { readE2eSession } = await freshSeam()
    expect(readE2eSession()).toBeNull()
  })

  it('returns the planted session when VITE_E2E is set', async () => {
    vi.stubEnv('VITE_E2E', '1')
    ;(window as unknown as { __E2E_SESSION__?: TokenResponse }).__E2E_SESSION__ = SESSION
    const { readE2eSession } = await freshSeam()
    expect(readE2eSession()).toEqual(SESSION)
  })

  it('returns null when VITE_E2E is set but nothing is planted', async () => {
    vi.stubEnv('VITE_E2E', '1')
    const { readE2eSession } = await freshSeam()
    expect(readE2eSession()).toBeNull()
  })
})
