import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DecisionLedgerEntry } from '@heediq/shared'
import { ToastProvider } from '../../../components/ui'
import { LedgerSection } from '../LedgerSection'

const getMock = vi.fn()
const postMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
    patch: vi.fn(),
    delete: vi.fn(),
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
    status: 'confirmed', confidence: 1, origin: 'auto', sourceRefs: [],
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
  }
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LedgerSection contextId={ctx} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('LedgerSection', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    hasMock.mockReturnValue(true)
  })

  it('renders the entries returned by the API', async () => {
    getMock.mockResolvedValue({ entries: [entry(), entry({ entryId: 'e2', topic: 'DB choice', status: 'open', answer: null })] })
    renderSection()
    expect(await screen.findByText('Auth provider')).toBeInTheDocument()
    expect(screen.getByText('DB choice')).toBeInTheDocument()
  })

  it('shows the empty state when there are no entries', async () => {
    getMock.mockResolvedValue({ entries: [] })
    renderSection()
    expect(await screen.findByText('No ledger entries yet')).toBeInTheDocument()
  })

  it('shows an error state with retry on failure', async () => {
    getMock.mockRejectedValue(new Error('boom'))
    renderSection()
    expect(await screen.findByText("Couldn't load the ledger")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('adds an entry by topic', async () => {
    getMock.mockResolvedValue({ entries: [] })
    postMock.mockResolvedValue({ entryId: 'new' })
    renderSection()
    await screen.findByText('No ledger entries yet')
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }))
    await userEvent.type(screen.getByLabelText('Topic'), 'Rollout date?')
    await userEvent.click(screen.getByRole('button', { name: 'Add to ledger' }))
    await waitFor(() => expect(postMock).toHaveBeenCalledWith(`/contexts/${ctx}/ledger`, { topic: 'Rollout date?' }))
  })

  it('hides the add affordance without context:update', async () => {
    hasMock.mockReturnValue(false)
    getMock.mockResolvedValue({ entries: [] })
    renderSection()
    await screen.findByText('No ledger entries yet')
    expect(screen.queryByRole('button', { name: 'Add entry' })).not.toBeInTheDocument()
  })
})
