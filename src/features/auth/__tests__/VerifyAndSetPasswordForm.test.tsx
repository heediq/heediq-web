import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VerifyAndSetPasswordForm } from '../VerifyAndSetPasswordForm'

const postMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { post: (...args: unknown[]) => postMock(...args) },
}))

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

  it('moves from the code step to the password step without submitting anything yet', async () => {
    postMock.mockResolvedValue({ sent: true })
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    postMock.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByLabelText('Create a password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
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

  it('submits the code and password to link/confirm and calls onSuccess with the new password', async () => {
    postMock.mockResolvedValueOnce({ sent: true })
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
        code: '123456',
        newPassword: 'Password123!',
      }),
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Password123!'))
  })

  it('shows a generic error when link/confirm fails', async () => {
    postMock.mockResolvedValueOnce({ sent: true })
    postMock.mockRejectedValueOnce(new Error('boom'))

    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} />)

    await userEvent.type(await screen.findByLabelText('Verification code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.type(await screen.findByLabelText('Create a password'), 'Password123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('renders a back button only when onBack is provided, on the code step', async () => {
    postMock.mockResolvedValue({ sent: true })
    const onBack = vi.fn()
    render(<VerifyAndSetPasswordForm email="a@b.com" onSuccess={vi.fn()} onBack={onBack} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Use a different email' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
