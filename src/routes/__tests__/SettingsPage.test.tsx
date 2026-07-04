import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsPage } from '../SettingsPage'

const startProviderLink = vi.fn()
vi.mock('../../lib/auth/cognito-oauth', () => ({
  startProviderLink: (...args: unknown[]) => startProviderLink(...args),
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    startProviderLink.mockReset()
  })

  it('shows buttons to link Google and Microsoft', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('button', { name: 'Add Google' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Microsoft' })).toBeInTheDocument()
  })

  it('starts the Google provider-link OAuth flow', async () => {
    render(<SettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add Google' }))
    expect(startProviderLink).toHaveBeenCalledWith('Google')
  })

  it('starts the Microsoft provider-link OAuth flow', async () => {
    render(<SettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add Microsoft' }))
    expect(startProviderLink).toHaveBeenCalledWith('Microsoft')
  })
})
