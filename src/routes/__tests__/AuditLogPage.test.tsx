import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui'
import { AuditLogPage } from '../AuditLogPage'

const getMock = vi.fn()

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiClientError: class extends Error {},
}))

const entry = {
  orgId: 'org-1',
  eventId: 'evt-1',
  timestamp: '2026-01-01T00:00:00.000Z',
  actorUserId: 'user-1',
  actorEmail: 'admin@heediq.com',
  action: 'role:create',
  resourceType: 'role' as const,
  after: { roleId: 'role-1', name: 'Reviewer', permissions: [] },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuditLogPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('AuditLogPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    // Radix Select relies on DOM APIs jsdom doesn't implement.
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })

  it('shows an error state with retry when the fetch fails', async () => {
    getMock.mockRejectedValue(new Error('boom'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the audit log.')
  })

  it('lists audit log entries', async () => {
    getMock.mockResolvedValue({ entries: [entry], nextCursor: null })
    renderPage()

    expect(await screen.findByText('admin@heediq.com')).toBeInTheDocument()
    expect(screen.getByText('role:create')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
  })

  it('shows a designed empty state when there are no entries', async () => {
    getMock.mockResolvedValue({ entries: [], nextCursor: null })
    renderPage()

    expect(await screen.findByText('No audit log entries yet')).toBeInTheDocument()
  })

  it('refetches with the actorUserId filter applied', async () => {
    getMock.mockResolvedValue({ entries: [], nextCursor: null })
    renderPage()

    await waitFor(() => expect(getMock).toHaveBeenCalledWith('/org/audit-log'))

    await userEvent.type(screen.getByLabelText('Actor user ID'), 'user-1')

    await waitFor(() =>
      expect(getMock).toHaveBeenLastCalledWith('/org/audit-log?actorUserId=user-1'),
    )
  })

  it('shows Load more when nextCursor is present and fetches the next page on click', async () => {
    getMock.mockResolvedValueOnce({ entries: [entry], nextCursor: 'cursor-1' })
    renderPage()

    const loadMore = await screen.findByRole('button', { name: 'Load more' })

    getMock.mockResolvedValueOnce({
      entries: [{ ...entry, eventId: 'evt-2', actorEmail: 'member@heediq.com' }],
      nextCursor: null,
    })
    await userEvent.click(loadMore)

    await waitFor(() => expect(getMock).toHaveBeenLastCalledWith('/org/audit-log?cursor=cursor-1'))
    expect(await screen.findByText('member@heediq.com')).toBeInTheDocument()
    expect(screen.getByText('admin@heediq.com')).toBeInTheDocument()
  })
})
