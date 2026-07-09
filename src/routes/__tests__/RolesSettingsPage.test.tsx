import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui'
import { RolesSettingsPage } from '../RolesSettingsPage'

const getMock = vi.fn()

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiClientError: class extends Error {},
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RolesSettingsPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('RolesSettingsPage', () => {
  beforeEach(() => {
    getMock.mockImplementation((path: string) => {
      if (path === '/roles') return Promise.resolve({ roles: [] })
      if (path === '/groups') return Promise.resolve({ groups: [] })
      throw new Error(`unexpected path ${path}`)
    })
  })

  it('shows the roles tab by default and switches to groups on click', async () => {
    renderPage()

    expect(screen.getByRole('tab', { name: 'Roles' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('button', { name: 'Create role' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Groups' }))

    expect(screen.getByRole('tab', { name: 'Groups' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('button', { name: 'Create group' })).toBeInTheDocument()
  })
})
