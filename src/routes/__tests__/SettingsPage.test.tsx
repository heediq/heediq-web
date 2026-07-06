import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsPage } from '../SettingsPage'

const startProviderLink = vi.fn()
vi.mock('../../lib/auth/cognito-oauth', () => ({
  startProviderLink: (...args: unknown[]) => startProviderLink(...args),
}))

const getMock = vi.fn()
const postMock = vi.fn()
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}))

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>,
  )
}

function mockMeAndMethods(methods: { provider: string; linkedAt: string }[]) {
  getMock.mockImplementation((path: string) => {
    if (path === '/me') {
      return Promise.resolve({ user: { email: 'user@heediq.com', passwordSet: methods.some((m) => m.provider === 'COGNITO') }, org: {} })
    }
    if (path === '/auth/methods') {
      return Promise.resolve({ methods })
    }
    throw new Error(`unexpected path ${path}`)
  })
}

describe('SettingsPage', () => {
  beforeEach(() => {
    startProviderLink.mockReset()
    getMock.mockReset()
    postMock.mockReset()
  })

  it('shows a loading indicator while methods and profile are being fetched', async () => {
    getMock.mockReturnValue(new Promise(() => {}))
    renderSettings()
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument()
  })

  it('shows an error state with retry when the methods fetch fails', async () => {
    getMock.mockRejectedValue(new Error('boom'))
    renderSettings()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your sign-in methods.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('lists active sign-in methods and only shows actions for unlinked providers', async () => {
    mockMeAndMethods([{ provider: 'Google', linkedAt: '2026-01-01T00:00:00.000Z' }])
    renderSettings()

    expect(await screen.findByText('Google')).toBeInTheDocument()
    expect(screen.getAllByText('Active')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Set a password' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Google' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Microsoft' })).toBeInTheDocument()
  })

  it('starts the Google provider-link OAuth flow', async () => {
    mockMeAndMethods([])
    renderSettings()

    await userEvent.click(await screen.findByRole('button', { name: 'Add Google' }))
    expect(startProviderLink).toHaveBeenCalledWith('Google')
  })

  it('starts the Microsoft provider-link OAuth flow', async () => {
    mockMeAndMethods([])
    renderSettings()

    await userEvent.click(await screen.findByRole('button', { name: 'Add Microsoft' }))
    expect(startProviderLink).toHaveBeenCalledWith('Microsoft')
  })

  it('sets a password via the shared verify+password component and refreshes the methods list', async () => {
    mockMeAndMethods([])
    postMock.mockResolvedValueOnce({ sent: true }) // request-otp, auto-sent by the shared form
    postMock.mockResolvedValueOnce({ verified: true }) // link/verify-otp
    postMock.mockResolvedValueOnce(undefined) // link/confirm

    renderSettings()
    await userEvent.click(await screen.findByRole('button', { name: 'Set a password' }))

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await userEvent.type(await screen.findByLabelText('Create a password'), 'Password123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!')

    mockMeAndMethods([{ provider: 'COGNITO', linkedAt: '2026-01-01T00:00:00.000Z' }])
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/link/confirm', {
        email: 'user@heediq.com',
        newPassword: 'Password123!',
      }),
    )
    expect(await screen.findByText('Password')).toBeInTheDocument()
  })
})
