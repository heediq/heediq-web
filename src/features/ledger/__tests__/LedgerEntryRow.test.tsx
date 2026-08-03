import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DecisionLedgerEntry } from '@heediq/shared'
import { ToastProvider } from '../../../components/ui'
import { LedgerEntryRow } from '../LedgerEntryRow'

const patchMock = vi.fn()
const deleteMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    patch: (...a: unknown[]) => patchMock(...a),
    delete: (...a: unknown[]) => deleteMock(...a),
  },
}))

const hasMock = vi.fn()
vi.mock('../../../lib/rbac/usePermissions', () => ({
  usePermissions: () => ({ permissions: [], isLoading: false, has: hasMock }),
}))

const ctx = 'ctx-1'
function entry(o: Partial<DecisionLedgerEntry> = {}): DecisionLedgerEntry {
  return {
    entryId: 'e1', contextId: ctx, topic: 'Auth provider', answer: 'Cognito',
    status: 'confirmed', confidence: 1, origin: 'user', sourceRefs: [],
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
  }
}

function renderRow(e: DecisionLedgerEntry) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LedgerEntryRow contextId={ctx} entry={e} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('LedgerEntryRow', () => {
  beforeEach(() => {
    patchMock.mockReset()
    deleteMock.mockReset()
    hasMock.mockReturnValue(true)
  })

  it('shows an open prompt and no answer text for an open entry', () => {
    renderRow(entry({ status: 'open', answer: null }))
    expect(screen.getByText('Open — needs an answer')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('fills an open entry: PATCHes the typed answer', async () => {
    patchMock.mockResolvedValue({})
    renderRow(entry({ status: 'open', answer: null }))
    await userEvent.click(screen.getByRole('button', { name: 'Answer' }))
    await userEvent.type(screen.getByLabelText('Answer'), 'DynamoDB')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith(`/contexts/${ctx}/ledger/e1`, { answer: 'DynamoDB' }),
    )
  })

  it('reopens a confirmed entry when the answer is cleared', async () => {
    patchMock.mockResolvedValue({})
    renderRow(entry())
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.clear(screen.getByLabelText('Answer'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith(`/contexts/${ctx}/ledger/e1`, { answer: null }),
    )
  })

  it('requires a confirm step before deleting', async () => {
    deleteMock.mockResolvedValue({ entryId: 'e1' })
    renderRow(entry())
    await userEvent.click(screen.getByRole('button', { name: 'Delete entry' }))
    expect(deleteMock).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(`/contexts/${ctx}/ledger/e1`))
  })

  it('hides all write controls without context:update', () => {
    hasMock.mockReturnValue(false)
    renderRow(entry({ status: 'open', answer: null }))
    expect(screen.queryByRole('button', { name: 'Answer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete entry' })).not.toBeInTheDocument()
  })
})
