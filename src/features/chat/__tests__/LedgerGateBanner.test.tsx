import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DecisionLedgerEntry, LedgerBlockingEntry } from '@heediq/shared'
import { ToastProvider } from '../../../components/ui'
import { LedgerGateBanner } from '../LedgerGateBanner'

const getMock = vi.fn()
const patchMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...a: unknown[]) => getMock(...a),
    post: vi.fn(),
    patch: (...a: unknown[]) => patchMock(...a),
    delete: vi.fn(),
  },
}))

const hasMock = vi.fn(() => true)
vi.mock('../../../lib/rbac/usePermissions', () => ({
  usePermissions: () => ({ permissions: [], isLoading: false, has: hasMock }),
}))

function entry(o: Partial<DecisionLedgerEntry> = {}): DecisionLedgerEntry {
  return {
    entryId: 'e1', contextId: 'ctx-1', topic: 'Auth provider', answer: null,
    status: 'open', confidence: 0, origin: 'auto', sourceRefs: [],
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
  }
}

const blocking: LedgerBlockingEntry[] = [{ entryId: 'e1', topic: 'Auth provider', status: 'open' }]

function renderBanner(props: Partial<Parameters<typeof LedgerGateBanner>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const cbs = {
    onAllResolved: vi.fn(),
    onSendAnyway: vi.fn(),
    onDismiss: vi.fn(),
  }
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LedgerGateBanner contextId="ctx-1" blockingEntries={blocking} {...cbs} {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return cbs
}

describe('LedgerGateBanner', () => {
  beforeEach(() => {
    getMock.mockReset()
    patchMock.mockReset()
    hasMock.mockReturnValue(true)
  })

  it('lists the blocking entries from the live ledger', async () => {
    getMock.mockResolvedValue({ entries: [entry()] })
    renderBanner()
    expect(await screen.findByText('Auth provider')).toBeInTheDocument()
  })

  it('fires onSendAnyway when Send anyway is clicked', async () => {
    getMock.mockResolvedValue({ entries: [entry()] })
    const cbs = renderBanner()
    await screen.findByText('Auth provider')
    await userEvent.click(screen.getByRole('button', { name: 'Send anyway' }))
    expect(cbs.onSendAnyway).toHaveBeenCalledOnce()
  })

  it('auto-resolves once the last blocking entry is filled', async () => {
    let settled = false
    getMock.mockImplementation(() =>
      Promise.resolve({ entries: [settled ? entry({ status: 'confirmed', answer: 'Cognito' }) : entry()] }),
    )
    patchMock.mockImplementation(() => {
      settled = true
      return Promise.resolve(entry({ status: 'confirmed', answer: 'Cognito' }))
    })
    const cbs = renderBanner()

    await screen.findByText('Auth provider')
    await userEvent.click(screen.getByRole('button', { name: 'Answer' }))
    await userEvent.type(screen.getByLabelText('Answer'), 'Cognito')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cbs.onAllResolved).toHaveBeenCalled())
  })

  it('does not auto-resolve on first paint before blockers are observed', async () => {
    // Ledger already shows the entry settled (e.g. filled elsewhere just before) — must not
    // spuriously fire until we've actually seen it blocking.
    getMock.mockResolvedValue({ entries: [entry({ status: 'confirmed', answer: 'Cognito' })] })
    const cbs = renderBanner()
    await waitFor(() => expect(getMock).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(cbs.onAllResolved).not.toHaveBeenCalled()
  })
})
