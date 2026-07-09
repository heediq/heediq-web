import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { usePermissions } from '../usePermissions'

const getMock = vi.fn()
vi.mock('../../api-client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('usePermissions', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('is loading with an empty permission set before the fetch resolves', () => {
    getMock.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePermissions(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.permissions).toEqual([])
    expect(result.current.has('org:manage-roles')).toBe(false)
  })

  it('derives permissions from GET /me effectivePermissions', async () => {
    getMock.mockResolvedValue({
      user: {},
      org: {},
      effectivePermissions: ['sources:read', 'org:manage-roles'],
    })
    const { result } = renderHook(() => usePermissions(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.permissions).toEqual(['sources:read', 'org:manage-roles'])
    expect(result.current.has('org:manage-roles')).toBe(true)
    expect(result.current.has('audit:read')).toBe(false)
  })
})
