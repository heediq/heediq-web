import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VerifyAndSetPasswordForm } from '../VerifyAndSetPasswordForm'
import { ApiClientError } from '../../../lib/api-client'

const postMock = vi.fn()
vi.mock('../../../lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api-client')>()
  return {
    ...actual,
    apiClient: { post: (...args: unknown[]) => postMock(...args) },
  }
})

describe('VerifyAndSetPasswordForm', () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it('sends the OTP automatically on mount and shows a loading state first', async () => {
    postMock.mockResolvedValue({ sent: true })
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.getByText('Sending a code to a@b.com')).toBeInTheDocument()

    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/auth/link/request-otp', { email: 'a@b.com' }))
    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument()
  })

  it('still advances to the code step when the OTP request fails, with an inline warning', async () => {
    postMock.mockRejectedValue(new Error('boom'))
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't send a code. You can still enter one below if you already have it.",
    )
  })

  it('verifies the code against the backend before moving to the password step', async () => {
    postMock.mockResolvedValueOnce({ sent: true })
    postMock.mockResolvedValueOnce({ verified: true })
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    postMock.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/link/verify-otp', { email: 'a@b.com', code: '123456' }),
    )
    expect(await screen.findByLabelText('Create a password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('stays on the code step and shows an error when the code is rejected', async () => {
    postMock.mockResolvedValueOnce({ sent: true })
    postMock.mockRejectedValueOnce(new ApiClientError('BAD_REQUEST', 'Invalid or expired verification code'))
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That code is incorrect or expired. Please check it and try again.')
    expect(screen.getByLabelText('Verification code')).toBeInTheDocument()
    expect(screen.queryByLabelText('Create a password')).not.toBeInTheDocument()
  })

  it('disables submit until the password satisfies every policy rule, showing live requirement feedback', async () => {
    postMock.mockResolvedValue({ sent: true })
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    const submit = screen.getByRole('button', { name: 'Set password' })
    expect(submit).toBeDisabled()
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()

    const passwordInput = await screen.findByLabelText('Create a password')
    await userEvent.type(passwordInput, 'weak')
    expect(submit).toBeDisabled()

    await userEvent.type(passwordInput, 'password1!')
    expect(submit).toBeDisabled() // still missing an uppercase letter

    await userEvent.type(passwordInput, 'A')
    expect(submit).not.toBeDisabled()
  })

  it('shows a mismatch error and does not submit when the two password fields differ', async () => {
    postMock.mockResolvedValue({ sent: true })
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.type(await screen.findByLabelText('Create a password'), 'Password123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Different123!')
    postMock.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Passwords don't match.")
    expect(postMock).not.toHaveBeenCalledWith('/auth/link/confirm', expect.anything())
  })

  it('submits the password to link/confirm (no code) and calls onSuccess with the new password', async () => {
    postMock.mockResolvedValueOnce({ sent: true })
    postMock.mockResolvedValueOnce({ verified: true })
    postMock.mockResolvedValueOnce(undefined)
    const onSuccess = vi.fn()

    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={onSuccess} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.type(await screen.findByLabelText('Create a password'), 'Password123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/link/confirm', {
        email: 'a@b.com',
        newPassword: 'Password123!',
      }),
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Password123!'))
  })

  it('shows a generic error when link/confirm fails', async () => {
    postMock.mockResolvedValueOnce({ sent: true })
    postMock.mockResolvedValueOnce({ verified: true })
    postMock.mockRejectedValueOnce(new Error('boom'))

    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.type(await screen.findByLabelText('Create a password'), 'Password123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('shows a requirements-specific error when the backend rejects the password on policy grounds', async () => {
    postMock.mockResolvedValueOnce({ sent: true })
    postMock.mockResolvedValueOnce({ verified: true })
    postMock.mockRejectedValueOnce(new ApiClientError('WEAK_PASSWORD', 'Password does not meet the requirements'))

    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.type(await screen.findByLabelText('Create a password'), 'Password123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("That password doesn't meet the requirements above.")
  })

  it('renders a back button only when onBack is provided, on the code step', async () => {
    postMock.mockResolvedValue({ sent: true })
    const onBack = vi.fn()
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} onBack={onBack} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Use a different email' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
