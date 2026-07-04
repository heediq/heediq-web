import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthCallbackPage } from '../AuthCallbackPage'
import { AuthProvider } from '../../lib/auth/AuthContext'
import { clearSession } from '../../lib/auth/token-store'

const exchangeCodeForTokens = vi.fn()
vi.mock('../../lib/auth/cognito-oauth', () => ({
  exchangeCodeForTokens: (...args: unknown[]) => exchangeCodeForTokens(...args),
  refreshTokens: vi.fn().mockRejectedValue(new Error('no refresh token in these tests')),
  startLogin: vi.fn(),
  logoutUrl: () => 'https://cognito.example/logout',
}))

function renderCallback(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<p>home screen</p>} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/sources" element={<p>sources library</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    exchangeCodeForTokens.mockReset()
    clearSession()
  })

  it('shows a signing-in indicator while the exchange is pending', () => {
    exchangeCodeForTokens.mockReturnValue(new Promise(() => {}))
    renderCallback('/auth/callback?code=abc&state=xyz')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('exchanges the code and redirects to /sources on success', async () => {
    exchangeCodeForTokens.mockResolvedValue({
      access_token: 'at',
      id_token: 'it',
      refresh_token: 'rt',
      token_type: 'Bearer',
      expires_in: 3600,
    })

    renderCallback('/auth/callback?code=abc&state=xyz')

    await waitFor(() => expect(screen.getByText('sources library')).toBeInTheDocument())
  })

  it('shows a designed error state with a retry action on failure', async () => {
    exchangeCodeForTokens.mockRejectedValue(new Error('state_mismatch'))

    renderCallback('/auth/callback?error=access_denied')

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText('Could not sign you in')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back to sign in' }))
    await waitFor(() => expect(screen.getByText('home screen')).toBeInTheDocument())
  })
})
