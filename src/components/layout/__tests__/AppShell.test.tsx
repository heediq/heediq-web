import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '../AppShell'

// TopBar + BottomTabBar render a <Can>-gated Contexts link, which reads permissions via GET /me.
vi.mock('../../../lib/api-client', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ user: {}, org: {}, effectivePermissions: [] }) },
}))

describe('AppShell', () => {
  it('renders the nav chrome and its children inside main', () => {
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
    // Settings appears in both the desktop TopBar nav and the mobile BottomTabBar (D-152).
    expect(screen.getAllByRole('link', { name: 'Settings' }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('main')).toHaveTextContent('page content')
  })
})
