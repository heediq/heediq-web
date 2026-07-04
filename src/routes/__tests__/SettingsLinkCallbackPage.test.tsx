import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsLinkCallbackPage } from '../SettingsLinkCallbackPage'
import { AuthProvider } from '../../lib/auth/AuthContext'
import { clearSession, setRefreshToken } from '../../lib/auth/token-store'

const exchangeLinkCodeForTokens = vi.fn()
vi.mock('../../lib/auth/cognito-oauth', () => ({
  exchangeLinkCodeForTokens: (...args: unknown[]) => exchangeLinkCodeForTokens(...args),
  refreshTokens: vi.fn().mockResolvedValue({ access_token: 'at', id_token: 'it', expires_in: 3600 }),
  startLogin: vi.fn(),
  logoutUrl: () => 'https://cognito.example/logout',
}))

const postMock = vi.fn()
vi.mock('../../lib/api-client', () => ({
  apiClient: { post: (...args: unknown[]) => postMock(...args) },
  setAccessTokenGetter: vi.fn(),
}))

function idTokenWithIdentities(identities: unknown): string {
  const payload = { identities: JSON.stringify(identities) }
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${base64}.signature`
}

function renderCallback() {
  return render(
    <MemoryRouter initialEntries={['/settings/link-callback?code=abc&state=xyz']}>
      <AuthProvider>
        <Routes>
          <Route path="/settings" element={<p>settings screen</p>} />
          <Route path="/settings/link-callback" element={<SettingsLinkCallbackPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('SettingsLinkCallbackPage', () => {
  beforeEach(() => {
    exchangeLinkCodeForTokens.mockReset()
    postMock.mockReset()
    clearSession()
    setRefreshToken('current-session-refresh-token')
  })

  it('shows a linking indicator while the exchange is pending', () => {
    exchangeLinkCodeForTokens.mockReturnValue(new Promise(() => {}))
    renderCallback()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('extracts the federated identity and posts it to link/add-provider, then returns to settings', async () => {
    exchangeLinkCodeForTokens.mockResolvedValue({
      access_token: 'link-at',
      id_token: idTokenWithIdentities([{ userId: 'google-123', providerName: 'Google' }]),
      refresh_token: 'link-rt',
      token_type: 'Bearer',
      expires_in: 3600,
    })
    postMock.mockResolvedValue(undefined)

    renderCallback()

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/settings/link/add-provider', {
        provider: 'Google',
        providerUserId: 'google-123',
      }),
    )
    await waitFor(() => expect(screen.getByText('settings screen')).toBeInTheDocument())
  })

  it('shows a designed error state with a retry action when the exchange fails', async () => {
    exchangeLinkCodeForTokens.mockRejectedValue(new Error('state_mismatch'))

    renderCallback()

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText('Could not link that account')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back to settings' }))
    await waitFor(() => expect(screen.getByText('settings screen')).toBeInTheDocument())
  })
})
