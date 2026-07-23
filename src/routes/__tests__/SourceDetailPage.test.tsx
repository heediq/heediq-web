import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SourceDetailPage } from '../SourceDetailPage'

const getMock = vi.fn()
const { MockApiClientError } = vi.hoisted(() => ({
  MockApiClientError: class extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))
vi.mock('../../lib/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
  ApiClientError: MockApiClientError,
}))

// SourceDetailPage subscribes to classification_ready via useWsEvent, which needs a WsProvider —
// out of scope for this unit test, so stub it to a no-op.
vi.mock('../../lib/ws/useWsEvent', () => ({ useWsEvent: () => {} }))

const source = {
  sourceId: 's1',
  orgId: 'o1',
  userId: 'u1',
  title: 'Kickoff meeting',
  status: 'ready',
  labels: [],
  classification: 'pending_review',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

const item = {
  itemId: 'i1',
  sourceId: 's1',
  orgId: 'o1',
  category: 'requirements',
  text: 'Must export CSV',
  confidence: 0.9,
  status: 'proposed',
  createdAt: '2026-07-01T00:00:00.000Z',
}

function defaultRoutes(path: string) {
  if (path === '/sources/s1') return Promise.resolve({ source })
  if (path === '/sources/s1/summary')
    return Promise.resolve({ summary: { sourceId: 's1', orgId: 'o1', gist: 'A short gist.', transcript: 'Hello world.', createdAt: '2026-07-01T00:00:00.000Z' } })
  if (path === '/sources/s1/items') return Promise.resolve({ items: [item] })
  return Promise.reject(new Error(`unexpected ${path}`))
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/sources/s1']}>
        <Routes>
          <Route path="/sources/:sourceId" element={<SourceDetailPage />} />
          <Route path="/sources/:sourceId/review" element={<div>review page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SourceDetailPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockImplementation((path: string) => defaultRoutes(path))
  })

  it('renders title, status, gist, transcript, and extracted items', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kickoff meeting' })).toBeInTheDocument())
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('A short gist.')).toBeInTheDocument()
    expect(screen.getByText('Hello world.')).toBeInTheDocument()
    expect(screen.getByText('Must export CSV')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Requirements' })).toBeInTheDocument()
  })

  it('shows a Review action for a pending_review source and navigates on click', async () => {
    renderPage()
    const reviewBtn = await screen.findByRole('button', { name: 'Review' })
    await userEvent.click(reviewBtn)
    await waitFor(() => expect(screen.getByText('review page')).toBeInTheDocument())
  })

  it('treats a 404 summary as “not ready”, not an error', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === '/sources/s1/summary') return Promise.reject(new MockApiClientError('NOT_FOUND', 'no summary'))
      return defaultRoutes(path)
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('No summary yet — it appears once processing finishes.')).toBeInTheDocument(),
    )
    expect(screen.getByText('No transcript yet — it appears once processing finishes.')).toBeInTheDocument()
  })

  it('shows an empty state when there are no extracted items', async () => {
    getMock.mockImplementation((path: string) =>
      path === '/sources/s1/items' ? Promise.resolve({ items: [] }) : defaultRoutes(path),
    )
    renderPage()
    await waitFor(() => expect(screen.getByText('No extracted items')).toBeInTheDocument())
  })

  it('shows an error state with retry when the source fails to load', async () => {
    getMock.mockImplementation((path: string) =>
      path === '/sources/s1' ? Promise.reject(new Error('boom')) : defaultRoutes(path),
    )
    renderPage()
    await waitFor(() => expect(screen.getByText('Couldn’t load this source')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
