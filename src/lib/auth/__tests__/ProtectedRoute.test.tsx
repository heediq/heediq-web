import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProtectedRoute } from '../ProtectedRoute'
import { clearSession, setRefreshToken } from '../token-store'

const refreshTokens = vi.fn()
vi.mock('../cognito-oauth', () => ({
  refreshTokens: (...args: unknown[]) => refreshTokens(...args),
  startLogin: vi.fn(),
  logoutUrl: () => 'https://cognito.example/logout',
}))

// AuthProvider is imported lazily per-test after cognito-oauth is mocked, mirroring the module's real import chain.
import { AuthProvider } from '../AuthContext'

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/sources']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<p>home screen</p>} />
          <Route path="/sources" element={<ProtectedRoute>{<p>secret sources</p>}</ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    refreshTokens.mockReset()
    clearSession()
  })

  it('redirects to home when the user is anonymous', async () => {
    renderProtected()
    await waitFor(() => expect(screen.getByText('home screen')).toBeInTheDocument())
    expect(screen.queryByText('secret sources')).not.toBeInTheDocument()
  })

  it('renders the protected content once authenticated', async () => {
    setRefreshToken('stored-refresh-token')
    refreshTokens.mockResolvedValue({ access_token: 'at', id_token: 'it', expires_in: 3600 })

    renderProtected()

    await waitFor(() => expect(screen.getByText('secret sources')).toBeInTheDocument())
  })
})
