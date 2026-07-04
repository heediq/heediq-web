import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '../AppShell'

vi.mock('../../../lib/auth/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated', login: vi.fn(), logout: vi.fn(), applyTokens: vi.fn() }),
}))

describe('AppShell', () => {
  it('renders the TopBar and its children inside main', () => {
    render(
      <AppShell>
        <p>page content</p>
      </AppShell>,
      { wrapper: MemoryRouter },
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('page content')
  })
})
