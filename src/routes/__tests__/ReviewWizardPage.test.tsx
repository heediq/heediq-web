import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui'
import { ReviewWizardPage } from '../ReviewWizardPage'

const getMock = vi.fn()
const postMock = vi.fn()
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
  ApiClientError: class extends Error {},
}))

// Step 3 (LedgerReconcileStep) subscribes to `ledger_ready` via useWsEvent, which needs a WsProvider.
vi.mock('../../lib/ws/useWsEvent', () => ({ useWsEvent: () => {} }))

const source = {
  sourceId: 's1',
  orgId: 'o1',
  userId: 'u1',
  title: 'Kickoff',
  status: 'ready',
  labels: [],
  classification: 'pending_review',
  proposedClassification: { proposedContextId: 'ctx-1', domain: 'work', labels: [], confidence: 0.9 },
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

const apollo = {
  contextId: 'ctx-1',
  orgId: 'o1',
  userId: 'u1',
  domain: 'work',
  name: 'Apollo',
  visibility: 'personal',
  status: 'active',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

const items = [
  { itemId: 'i1', sourceId: 's1', orgId: 'o1', category: 'requirements', text: 'Export CSV', confidence: 0.9, status: 'proposed', createdAt: '2026-07-01T00:00:00.000Z' },
  { itemId: 'i2', sourceId: 's1', orgId: 'o1', category: 'decisions', text: 'Use DynamoDB', confidence: 0.8, status: 'proposed', createdAt: '2026-07-01T00:00:00.000Z' },
]

function routeGet(path: string, srcOverride?: typeof source) {
  if (path === '/sources/s1') return Promise.resolve({ source: srcOverride ?? source })
  if (path === '/sources/s1/items') return Promise.resolve({ items })
  if (path === '/contexts/tree') return Promise.resolve({ tree: [{ ...apollo, children: [] }] })
  return Promise.reject(new Error(`unexpected ${path}`))
}

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/sources/s1/review']}>
          <Routes>
            <Route path="/sources/:sourceId/review" element={<ReviewWizardPage />} />
            <Route path="/sources/:sourceId" element={<div>source detail</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ReviewWizardPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    getMock.mockImplementation((path: string) => routeGet(path))
  })

  it('walks placement → items and files kept items into the chosen context', async () => {
    postMock.mockResolvedValue({ keptCount: 2, discardedCount: 0 })
    renderWizard()

    // Step 1 — the classifier's proposed context seeds the placement, so Next is enabled.
    await waitFor(() => expect(screen.getByText('Heediq suggests')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Step 2 — both items present and checked by default.
    const csv = await screen.findByRole('checkbox', { name: 'Export CSV' })
    expect(csv).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Use DynamoDB' })).toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: 'File 2 items' }))
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/sources/s1/review', { contextId: 'ctx-1', kept: ['i1', 'i2'] }),
    )
    // Filing advances to reconciliation (step 3) rather than leaving the wizard.
    await waitFor(() => expect(screen.getByText('Reconciling decisions…')).toBeInTheDocument())
  })

  it('excludes unchecked items from the kept set', async () => {
    postMock.mockResolvedValue({ keptCount: 1, discardedCount: 1 })
    renderWizard()
    await waitFor(() => expect(screen.getByText('Heediq suggests')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Use DynamoDB' }))
    await userEvent.click(screen.getByRole('button', { name: 'File 1 items' }))
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/sources/s1/review', { contextId: 'ctx-1', kept: ['i1'] }),
    )
  })

  it('shows an already-filed state for an approved source', async () => {
    getMock.mockImplementation((path: string) =>
      routeGet(path, { ...source, classification: 'approved' }),
    )
    renderWizard()
    await waitFor(() => expect(screen.getByText('Already filed')).toBeInTheDocument())
  })
})
