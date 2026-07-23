import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '../AppShell'

vi.mock('../../../lib/auth/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated', login: vi.fn(), logout: vi.fn(), applyTokens: vi.fn() }),
}))

// TopBar renders a <Can>-gated Contexts link, which reads permissions via useQuery(GET /me).
vi.mock('../../../lib/api-client', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ user: {}, org: {}, effectivePermissions: [] }) },
}))

describe('AppShell', () => {
  it('renders the TopBar and its children inside main', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppShell>
            <p>page content</p>
          </AppShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('page content')
  })
})
