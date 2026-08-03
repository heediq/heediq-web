import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useCreateLedgerEntry,
  useDeleteLedgerEntry,
  useLedger,
  useUpdateLedgerEntry,
} from '../ledger-api'

const getMock = vi.fn()
const postMock = vi.fn()
const patchMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
    patch: (...a: unknown[]) => patchMock(...a),
    delete: (...a: unknown[]) => deleteMock(...a),
  },
}))

const ctx = 'ctx-1'

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('ledger-api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    patchMock.mockReset()
    deleteMock.mockReset()
  })

  it('useLedger GETs the context ledger', async () => {
    getMock.mockResolvedValue({ entries: [] })
    const { result } = renderHook(() => useLedger(ctx), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getMock).toHaveBeenCalledWith(`/contexts/${ctx}/ledger`)
  })

  it('useLedger is disabled without a contextId', () => {
    const { result } = renderHook(() => useLedger(undefined), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(getMock).not.toHaveBeenCalled()
  })

  it('useCreateLedgerEntry POSTs the topic', async () => {
    postMock.mockResolvedValue({ entryId: 'e1' })
    const { result } = renderHook(() => useCreateLedgerEntry(ctx), { wrapper: wrapper() })
    await result.current.mutateAsync({ topic: 'Auth provider' })
    expect(postMock).toHaveBeenCalledWith(`/contexts/${ctx}/ledger`, { topic: 'Auth provider' })
  })

  it('useUpdateLedgerEntry PATCHes the entry path and body', async () => {
    patchMock.mockResolvedValue({ entryId: 'e1' })
    const { result } = renderHook(() => useUpdateLedgerEntry(ctx), { wrapper: wrapper() })
    await result.current.mutateAsync({ entryId: 'e1', body: { answer: 'Cognito' } })
    expect(patchMock).toHaveBeenCalledWith(`/contexts/${ctx}/ledger/e1`, { answer: 'Cognito' })
  })

  it('useDeleteLedgerEntry DELETEs the entry path', async () => {
    deleteMock.mockResolvedValue({ entryId: 'e1' })
    const { result } = renderHook(() => useDeleteLedgerEntry(ctx), { wrapper: wrapper() })
    await result.current.mutateAsync('e1')
    expect(deleteMock).toHaveBeenCalledWith(`/contexts/${ctx}/ledger/e1`)
  })
})
