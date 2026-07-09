import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { Can } from '../Can'

const getMock = vi.fn()
vi.mock('../../api-client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}))

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('Can', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('renders nothing while permissions are loading', () => {
    getMock.mockReturnValue(new Promise(() => {}))
    renderWithClient(<Can permission="org:manage-roles">visible</Can>)
    expect(screen.queryByText('visible')).not.toBeInTheDocument()
  })

  it('renders children when the caller has the permission', async () => {
    getMock.mockResolvedValue({ user: {}, org: {}, effectivePermissions: ['org:manage-roles'] })
    renderWithClient(<Can permission="org:manage-roles">visible</Can>)
    await waitFor(() => expect(screen.getByText('visible')).toBeInTheDocument())
  })

  it('renders nothing (or fallback) when the caller lacks the permission', async () => {
    getMock.mockResolvedValue({ user: {}, org: {}, effectivePermissions: ['sources:read'] })
    renderWithClient(<Can permission="org:manage-roles" fallback={<span>fallback</span>}>visible</Can>)
    await waitFor(() => expect(screen.getByText('fallback')).toBeInTheDocument())
    expect(screen.queryByText('visible')).not.toBeInTheDocument()
  })
})
