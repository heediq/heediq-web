import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IdentityProviderButton } from './IdentityProviderButton'

describe('IdentityProviderButton', () => {
  it('renders the Google variant with its own label', () => {
    render(<IdentityProviderButton provider="Google" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('renders the Microsoft variant with its own label', () => {
    render(<IdentityProviderButton provider="Microsoft" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Continue with Microsoft' })).toBeInTheDocument()
  })

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<IdentityProviderButton provider="Google" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows a spinner, sets aria-busy, and disables the control while loading', () => {
    render(<IdentityProviderButton provider="Google" loading onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('disables the control when disabled is passed directly', () => {
    render(<IdentityProviderButton provider="Microsoft" disabled onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Continue with Microsoft' })).toBeDisabled()
  })
})
