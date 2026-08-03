import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DecisionLedgerEntry } from '@heediq/shared'
import { ToastProvider } from '../../../components/ui'
import { LedgerReconcileStep } from '../LedgerReconcileStep'

const getMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...a: unknown[]) => getMock(...a),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const hasMock = vi.fn()
vi.mock('../../../lib/rbac/usePermissions', () => ({
  usePermissions: () => ({ permissions: [], isLoading: false, has: hasMock }),
}))

// Capture the ledger_ready handler so the test can fire the event on demand.
let readyHandler: ((p: { contextId: string; sourceId: string; entryCount: number }) => void) | undefined
vi.mock('../../../lib/ws/useWsEvent', () => ({
  useWsEvent: (_type: string, handler: (p: never) => void) => {
    readyHandler = handler as never
  },
}))

const ctx = 'ctx-1'
const src = 'src-1'
function entry(o: Partial<DecisionLedgerEntry> = {}): DecisionLedgerEntry {
  return {
    entryId: 'e1', contextId: ctx, topic: 'Auth provider', answer: 'Cognito',
    status: 'confirmed', confidence: 1, origin: 'auto', sourceRefs: [],
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
  }
}

function renderStep(onFinish = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LedgerReconcileStep contextId={ctx} sourceId={src} onFinish={onFinish} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return onFinish
}

function fireReady() {
  act(() => readyHandler?.({ contextId: ctx, sourceId: src, entryCount: 2 }))
}

describe('LedgerReconcileStep', () => {
  beforeEach(() => {
    getMock.mockReset()
    hasMock.mockReturnValue(true)
    readyHandler = undefined
  })

  it('shows a reconciling state until ledger_ready arrives', () => {
    renderStep()
    expect(screen.getByText('Reconciling decisions…')).toBeInTheDocument()
    expect(getMock).not.toHaveBeenCalled()
  })

  it('ignores ledger_ready for a different source', () => {
    renderStep()
    act(() => readyHandler?.({ contextId: ctx, sourceId: 'other', entryCount: 1 }))
    expect(screen.getByText('Reconciling decisions…')).toBeInTheDocument()
    expect(getMock).not.toHaveBeenCalled()
  })

  it('surfaces open/needs_review entries to fill once ready', async () => {
    getMock.mockResolvedValue({
      entries: [
        entry(),
        entry({ entryId: 'e2', topic: 'DB choice', status: 'open', answer: null }),
        entry({ entryId: 'e3', topic: 'Rollout date', status: 'needs_review', answer: 'Q3' }),
      ],
    })
    renderStep()
    fireReady()
    expect(await screen.findByText('These decisions need your input')).toBeInTheDocument()
    expect(screen.getByText('DB choice')).toBeInTheDocument()
    expect(screen.getByText('Rollout date')).toBeInTheDocument()
    // The confirmed entry is not something that needs input.
    expect(screen.queryByText('Auth provider')).not.toBeInTheDocument()
  })

  it('shows an all-settled state when nothing needs input', async () => {
    getMock.mockResolvedValue({ entries: [entry(), entry({ entryId: 'e2', status: 'confirmed' })] })
    renderStep()
    fireReady()
    expect(await screen.findByText('All decisions are settled')).toBeInTheDocument()
  })

  it('leaves via Done', async () => {
    getMock.mockResolvedValue({ entries: [entry({ status: 'open', answer: null })] })
    const onFinish = renderStep()
    fireReady()
    await screen.findByText('These decisions need your input')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onFinish).toHaveBeenCalledOnce()
  })
})
