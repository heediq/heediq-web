import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { TopBar } from '../TopBar'

const logout = vi.fn()
vi.mock('../../../lib/auth/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated', login: vi.fn(), logout, applyTokens: vi.fn() }),
}))

const getMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}))

function renderTopBar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ui: ReactNode = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return render(ui)
}

describe('TopBar', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockResolvedValue({ user: {}, org: {}, effectivePermissions: ['context:read'] })
  })

  it('renders a link to Settings', () => {
    renderTopBar()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })

  it('shows the Contexts link when the caller has context:read', async () => {
    renderTopBar()
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Contexts' })).toHaveAttribute('href', '/contexts'),
    )
  })

  it('hides the Contexts link when the caller lacks context:read', async () => {
    getMock.mockResolvedValue({ user: {}, org: {}, effectivePermissions: ['sources:read'] })
    renderTopBar()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    await waitFor(() => expect(getMock).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: 'Contexts' })).not.toBeInTheDocument()
  })

  it('calls logout when the Logout button is clicked', async () => {
    renderTopBar()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(logout).toHaveBeenCalledOnce()
  })
})
