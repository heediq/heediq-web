import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui'
import { ContextLibraryPage } from '../ContextLibraryPage'

const getMock = vi.fn()
vi.mock('../../lib/api-client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args), post: vi.fn() },
}))

const apollo = {
  contextId: 'ctx-1',
  orgId: 'org-1',
  userId: 'user-1',
  domain: 'work',
  name: 'Apollo',
  visibility: 'personal',
  status: 'active',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

function routeGet(path: string) {
  if (path === '/contexts/tree') return Promise.resolve({ tree: [{ ...apollo, children: [] }] })
  if (path === '/contexts/ctx-1') return Promise.resolve({ context: apollo })
  return Promise.reject(new Error(`unexpected ${path}`))
}

function renderAt(initial = '/contexts') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/contexts" element={<ContextLibraryPage />} />
            <Route path="/contexts/:contextId" element={<ContextLibraryPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ContextLibraryPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockImplementation((path: string) => routeGet(path))
  })

  it('renders the tree once loaded', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByRole('treeitem', { name: /Apollo/ })).toBeInTheDocument())
  })

  it('shows an empty state when there are no contexts', async () => {
    getMock.mockImplementation((path: string) =>
      path === '/contexts/tree' ? Promise.resolve({ tree: [] }) : routeGet(path),
    )
    renderAt()
    await waitFor(() => expect(screen.getByText('No contexts yet')).toBeInTheDocument())
  })

  it('shows an error state with retry when the tree fails to load', async () => {
    getMock.mockImplementation((path: string) =>
      path === '/contexts/tree' ? Promise.reject(new Error('boom')) : routeGet(path),
    )
    renderAt()
    await waitFor(() => expect(screen.getByText('Couldn’t load your contexts')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('selecting a context navigates and shows its detail', async () => {
    renderAt()
    await userEvent.click(await screen.findByRole('treeitem', { name: /Apollo/ }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Apollo' })).toBeInTheDocument(),
    )
    // domain + visibility badges render in the detail panel
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('deep-links directly to a selected context', async () => {
    renderAt('/contexts/ctx-1')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Apollo' })).toBeInTheDocument())
  })
})
