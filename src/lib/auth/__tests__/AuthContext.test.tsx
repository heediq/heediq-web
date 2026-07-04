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

function Probe() {
  const { status } = useAuth()
  return <p>status:{status}</p>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    refreshTokens.mockReset()
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
})
