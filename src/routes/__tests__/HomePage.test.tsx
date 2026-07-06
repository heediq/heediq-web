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

const postMock = vi.fn()
vi.mock('../../lib/api-client', () => ({
  apiClient: { post: (...args: unknown[]) => postMock(...args) },
  setAccessTokenGetter: vi.fn(),
}))

const forgotPassword = vi.fn()
const confirmForgotPassword = vi.fn()
const initiateAuthPassword = vi.fn()
vi.mock('../../lib/auth/cognito-idp', async () => {
  const actual = await vi.importActual<typeof import('../../lib/auth/cognito-idp')>(
    '../../lib/auth/cognito-idp',
  )
  return {
    ...actual,
    forgotPassword: (...args: unknown[]) => forgotPassword(...args),
    confirmForgotPassword: (...args: unknown[]) => confirmForgotPassword(...args),
    initiateAuthPassword: (...args: unknown[]) => initiateAuthPassword(...args),
  }
})

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

async function submitEmailStep(email: string) {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
}

describe('HomePage', () => {
  beforeEach(() => {
    refreshTokens.mockReset()
    startLogin.mockReset()
    postMock.mockReset()
    forgotPassword.mockReset()
    confirmForgotPassword.mockReset()
    initiateAuthPassword.mockReset()
    clearSession()
  })

  it('shows the email-first step with an SSO fallback when anonymous', async () => {
    renderHome()
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Continue with Google or Microsoft' })).toBeInTheDocument()
  })

  it('starts the Hosted UI login flow from the SSO fallback', async () => {
    renderHome()
    await screen.findByLabelText('Email')
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google or Microsoft' }))
    expect(startLogin).toHaveBeenCalledTimes(1)
  })

  it('redirects an already-authenticated user straight to /sources', async () => {
    setRefreshToken('stored-refresh-token')
    refreshTokens.mockResolvedValue({ access_token: 'at', id_token: 'it', expires_in: 3600 })

    renderHome()

    await waitFor(() => expect(screen.getByText('sources library')).toBeInTheDocument())
  })

  it('routes a brand-new email to the shared verify+password flow and sends a code (D-089)', async () => {
    postMock.mockResolvedValueOnce({ exists: false, passwordSet: null })
    postMock.mockResolvedValueOnce({ sent: true })

    renderHome()
    await screen.findByLabelText('Email')
    await submitEmailStep('new@heediq.com')

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/link/request-otp', { email: 'new@heediq.com' }),
    )
    expect(await screen.findByText(/Enter the code we sent to new@heediq.com/)).toBeInTheDocument()
  })

  it('routes an existing federated-only email to the same verify+password flow (the reported bug)', async () => {
    postMock.mockResolvedValueOnce({ exists: true, passwordSet: false })
    postMock.mockResolvedValueOnce({ sent: true })

    renderHome()
    await screen.findByLabelText('Email')
    await submitEmailStep('federated@heediq.com')

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/link/request-otp', { email: 'federated@heediq.com' }),
    )
    expect(await screen.findByText(/Enter the code we sent to federated@heediq.com/)).toBeInTheDocument()
  })

  it('completes verify -> set password -> signed in, using a single shared component', async () => {
    postMock.mockResolvedValueOnce({ exists: false, passwordSet: null })
    postMock.mockResolvedValueOnce({ sent: true }) // request-otp (sent by the shared component)
    postMock.mockResolvedValueOnce({ verified: true }) // link/verify-otp
    postMock.mockResolvedValueOnce(undefined) // link/confirm
    initiateAuthPassword.mockResolvedValue({
      accessToken: 'at',
      idToken: 'it',
      refreshToken: 'rt',
      expiresIn: 3600,
    })

    renderHome()
    await screen.findByLabelText('Email')
    await submitEmailStep('new@heediq.com')

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await userEvent.type(await screen.findByLabelText('Create a password'), 'Password123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/link/confirm', {
        email: 'new@heediq.com',
        newPassword: 'Password123!',
      }),
    )
    await waitFor(() =>
      expect(initiateAuthPassword).toHaveBeenCalledWith('new@heediq.com', 'Password123!'),
    )
    await waitFor(() => expect(screen.getByText('sources library')).toBeInTheDocument())
  })

  it('routes an existing native account to the sign-in form and signs in', async () => {
    postMock.mockResolvedValue({ exists: true, passwordSet: true })
    initiateAuthPassword.mockResolvedValue({
      accessToken: 'at',
      idToken: 'it',
      refreshToken: 'rt',
      expiresIn: 3600,
    })

    renderHome()
    await screen.findByLabelText('Email')
    await submitEmailStep('existing@heediq.com')

    await userEvent.type(await screen.findByLabelText('Password'), 'CorrectPassword1!')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(initiateAuthPassword).toHaveBeenCalledWith('existing@heediq.com', 'CorrectPassword1!'),
    )
    await waitFor(() => expect(screen.getByText('sources library')).toBeInTheDocument())
  })

  it('shows a friendly message when sign-in fails with the wrong password', async () => {
    postMock.mockResolvedValue({ exists: true, passwordSet: true })
    const { CognitoIdpError } = await import('../../lib/auth/cognito-idp')
    initiateAuthPassword.mockRejectedValue(new CognitoIdpError('NotAuthorizedException', 'nope'))

    renderHome()
    await screen.findByLabelText('Email')
    await submitEmailStep('existing@heediq.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'WrongPassword1!')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Incorrect email or password.'))
  })

  it('sends a reset code from the sign-in form forgot-password link', async () => {
    postMock.mockResolvedValue({ exists: true, passwordSet: true })
    forgotPassword.mockResolvedValue(undefined)

    renderHome()
    await screen.findByLabelText('Email')
    await submitEmailStep('existing@heediq.com')
    await userEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }))

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith('existing@heediq.com'))
    expect(await screen.findByLabelText('New password')).toBeInTheDocument()
  })
})
