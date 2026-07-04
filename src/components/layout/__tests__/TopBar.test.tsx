import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from '../TopBar'

const logout = vi.fn()
vi.mock('../../../lib/auth/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated', login: vi.fn(), logout, applyTokens: vi.fn() }),
}))

describe('TopBar', () => {
  it('renders a link to Settings', () => {
    render(<TopBar />, { wrapper: MemoryRouter })
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })

  it('calls logout when the Logout button is clicked', async () => {
    render(<TopBar />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(logout).toHaveBeenCalledOnce()
  })
})
