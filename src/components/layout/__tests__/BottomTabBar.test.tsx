import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { BottomTabBar } from '../BottomTabBar'

// Can gates the Contexts tab; it reads permissions via useQuery(GET /me).
const getMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}))

function renderBar(initialPath = '/sources') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ui: ReactNode = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <BottomTabBar />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return render(ui)
}

describe('BottomTabBar', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockResolvedValue({ user: {}, org: {}, effectivePermissions: ['context:read'] })
  })

  it('renders the primary tabs as links', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'Sources' })).toHaveAttribute('href', '/sources')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })

  it('marks the current route active with aria-current', () => {
    renderBar('/settings')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Sources' })).not.toHaveAttribute('aria-current')
  })

  it('shows the Contexts tab only with context:read', async () => {
    renderBar()
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Contexts' })).toHaveAttribute('href', '/contexts'),
    )
  })

  it('hides the Contexts tab without context:read', async () => {
    getMock.mockResolvedValue({ user: {}, org: {}, effectivePermissions: ['sources:read'] })
    renderBar()
    await waitFor(() => expect(getMock).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: 'Contexts' })).not.toBeInTheDocument()
  })
})
