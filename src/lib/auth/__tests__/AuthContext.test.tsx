import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '../AuthContext'
import { clearSession, getRefreshToken, setRefreshToken } from '../token-store'

const refreshTokens = vi.fn()
vi.mock('../cognito-oauth', () => ({
  refreshTokens: (...args: unknown[]) => refreshTokens(...args),
  startLogin: vi.fn(),
  logoutUrl: () => 'https://cognito.example/logout',
}))

const setAccessTokenGetter = vi.fn()
vi.mock('../../api-client', () => ({
  setAccessTokenGetter: (fn: () => string | null) => setAccessTokenGetter(fn),
}))

function Probe() {
  const { status } = useAuth()
  return <p>status:{status}</p>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    refreshTokens.mockReset()
    setAccessTokenGetter.mockReset()
    clearSession()
  })

  it('goes straight to anonymous when there is no stored refresh token', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('status:anonymous')).toBeInTheDocument())
    expect(refreshTokens).not.toHaveBeenCalled()
  })

  it('silently refreshes into an authenticated session when a refresh token is stored', async () => {
    setRefreshToken('stored-refresh-token')
    refreshTokens.mockResolvedValue({ access_token: 'at', id_token: 'it', expires_in: 3600 })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('status:authenticated')).toBeInTheDocument())
    expect(refreshTokens).toHaveBeenCalledWith('stored-refresh-token')
  })

  it('falls back to anonymous and clears the stale refresh token if the silent refresh fails', async () => {
    setRefreshToken('stale-refresh-token')
    refreshTokens.mockRejectedValue(new Error('token_refresh_failed'))

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('status:anonymous')).toBeInTheDocument())
    expect(getRefreshToken()).toBeNull()
  })

  // Regression: heediq-api's authMiddleware requires custom:orgId/custom:role/email, which
  // Cognito's PreTokenGeneration trigger only injects into the ID token, never the access
  // token — wiring the wrong one causes every authenticated call to 401 with "Token missing
  // required claims".
  it('wires api-client to read the ID token, not the access token', async () => {
    setRefreshToken('stored-refresh-token')
    refreshTokens.mockResolvedValue({ access_token: 'at', id_token: 'it', expires_in: 3600 })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('status:authenticated')).toBeInTheDocument())

    expect(setAccessTokenGetter).toHaveBeenCalledTimes(1)
    const registeredGetter = setAccessTokenGetter.mock.calls[0]?.[0] as () => string | null
    expect(registeredGetter()).toBe('it')
  })

  // D-155 E2E seam: with VITE_E2E set, a window-planted synthetic session bootstraps straight to
  // authenticated with no Cognito refresh round trip. The seam is inert in real builds — proven in
  // e2e-seam.test.ts (flag off ⇒ planted session ignored).
  it('bootstraps from a planted E2E session when VITE_E2E is set, skipping the refresh round trip', async () => {
    vi.stubEnv('VITE_E2E', '1')
    ;(window as unknown as { __E2E_SESSION__?: unknown }).__E2E_SESSION__ = {
      access_token: 'e2e-at',
      id_token: 'e2e-it',
      refresh_token: 'e2e-rt',
      token_type: 'Bearer',
      expires_in: 3600,
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText('status:authenticated')).toBeInTheDocument())
    expect(refreshTokens).not.toHaveBeenCalled()
    const registeredGetter = setAccessTokenGetter.mock.calls[0]?.[0] as () => string | null
    expect(registeredGetter()).toBe('e2e-it')

    delete (window as unknown as { __E2E_SESSION__?: unknown }).__E2E_SESSION__
    vi.unstubAllEnvs()
  })
})
