import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HomePage } from '../HomePage'
import { AuthProvider } from '../../lib/auth/AuthContext'
import { clearSession, setRefreshToken } from '../../lib/auth/token-store'

const refreshTokens = vi.fn()
const startLogin = vi.fn()
vi.mock('../../lib/auth/cognito-oauth', () => ({
  refreshTokens: (...args: unknown[]) => refreshTokens(...args),
  startLogin: (...args: unknown[]) => startLogin(...args),
  logoutUrl: () => 'https://cognito.example/logout',
}))

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sources" element={<p>sources library</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    refreshTokens.mockReset()
    startLogin.mockReset()
    clearSession()
  })

  it('shows a sign-in button when anonymous', async () => {
    renderHome()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument())
  })

  it('starts the Hosted UI login flow on click', async () => {
    renderHome()
    const button = await screen.findByRole('button', { name: 'Sign in' })
    await userEvent.click(button)
    expect(startLogin).toHaveBeenCalledTimes(1)
  })

  it('redirects an already-authenticated user straight to /sources', async () => {
    setRefreshToken('stored-refresh-token')
    refreshTokens.mockResolvedValue({ access_token: 'at', id_token: 'it', expires_in: 3600 })

    renderHome()

    await waitFor(() => expect(screen.getByText('sources library')).toBeInTheDocument())
  })
})
