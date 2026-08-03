import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { SourcesLibraryPage } from '../SourcesLibraryPage'

const getMock = vi.fn()
vi.mock('../../lib/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}))

// SourcesLibraryPage subscribes to job_status + classification_ready via useWsEvent, which needs a
// WsProvider. Capture the handlers so we can fire them and assert the list refetches live.
const wsHandlers: Record<string, (payload: unknown) => void> = {}
vi.mock('../../lib/ws/useWsEvent', () => ({
  useWsEvent: (type: string, handler: (payload: unknown) => void) => {
    wsHandlers[type] = handler
  },
}))

const baseSource = {
  orgId: 'org-1',
  userId: 'user-1',
  labels: [],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}
const s1 = { ...baseSource, sourceId: 'src-1', title: 'Sprint planning', status: 'ready' as const }
const s2 = { ...baseSource, sourceId: 'src-2', title: 'Design review', status: 'processing' as const }

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/sources']}>
        <Routes>
          <Route path="/sources" element={<SourcesLibraryPage />} />
          <Route path="/sources/:sourceId" element={<div>detail page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SourcesLibraryPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockImplementation((path: string) => {
      if (path === '/sources') return Promise.resolve({ sources: [s1], nextCursor: 'cursor-2' })
      if (path === '/sources?cursor=cursor-2') return Promise.resolve({ sources: [s2], nextCursor: null })
      return Promise.reject(new Error(`unexpected ${path}`))
    })
  })
  afterEach(() => vi.clearAllMocks())

  it('renders sources with their status badge once loaded', async () => {
    renderPage()
    expect(await screen.findByText('Sprint planning')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows an empty state when there are no sources', async () => {
    getMock.mockImplementation(() => Promise.resolve({ sources: [], nextCursor: null }))
    renderPage()
    await waitFor(() => expect(screen.getByText('No sources yet')).toBeInTheDocument())
  })

  it('shows an error state with retry when the list fails to load', async () => {
    getMock.mockImplementation(() => Promise.reject(new Error('boom')))
    renderPage()
    await waitFor(() => expect(screen.getByText('Couldn’t load your sources')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('navigates to the source detail when a row is clicked', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Open Sprint planning' }))
    await waitFor(() => expect(screen.getByText('detail page')).toBeInTheDocument())
  })

  it('loads the next page and appends when Load more is clicked', async () => {
    renderPage()
    await screen.findByText('Sprint planning')
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(screen.getByText('Design review')).toBeInTheDocument())
    // First page's row is still present (appended, not replaced).
    expect(screen.getByText('Sprint planning')).toBeInTheDocument()
  })

  it('refetches the list when a job_status WS event arrives (live status updates)', async () => {
    renderPage()
    await screen.findByText('Sprint planning')
    const before = getMock.mock.calls.filter(([p]) => p === '/sources').length
    act(() => wsHandlers['job_status']?.({ sourceId: 'src-1', jobId: 'job-1', status: 'summarizing' }))
    await waitFor(() =>
      expect(getMock.mock.calls.filter(([p]) => p === '/sources').length).toBeGreaterThan(before),
    )
  })
})
