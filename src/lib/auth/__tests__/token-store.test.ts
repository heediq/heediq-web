import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearSession,
  getAccessToken,
  getIdToken,
  getRefreshToken,
  isSessionActive,
  setRefreshToken,
  setSession,
} from '../token-store'

describe('token-store', () => {
  beforeEach(() => {
    clearSession()
  })

  it('has no active session and no access/id token initially', () => {
    expect(isSessionActive()).toBe(false)
    expect(getAccessToken()).toBeNull()
    expect(getIdToken()).toBeNull()
  })

  it('activates a session once tokens are set, keeping access and id tokens distinct', () => {
    setSession({ access_token: 'at', id_token: 'it', expires_in: 3600 })
    expect(isSessionActive()).toBe(true)
    expect(getAccessToken()).toBe('at')
    expect(getIdToken()).toBe('it')
  })

  it('treats an expired session as inactive', () => {
    setSession({ access_token: 'at', id_token: 'it', expires_in: -1 })
    expect(isSessionActive()).toBe(false)
  })

  it('persists the refresh token across calls (localStorage)', () => {
    setRefreshToken('rt-1')
    expect(getRefreshToken()).toBe('rt-1')
  })

  it('clearSession wipes both the in-memory session and the persisted refresh token', () => {
    setSession({ access_token: 'at', id_token: 'it', expires_in: 3600 })
    setRefreshToken('rt-1')

    clearSession()

    expect(isSessionActive()).toBe(false)
    expect(getAccessToken()).toBeNull()
    expect(getIdToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
