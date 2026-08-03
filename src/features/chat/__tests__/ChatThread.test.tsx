import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LEDGER_GATED_ERROR_CODE } from '@heediq/shared'
import { ToastProvider } from '../../../components/ui'
import { ChatThread } from '../ChatThread'

const getMock = vi.fn()
const postMock = vi.fn()
// Hoisted so the vi.mock factory (itself hoisted) can reference the class without a TDZ error.
const { MockApiClientError } = vi.hoisted(() => ({
  MockApiClientError: class extends Error {
    code: string
    details?: unknown
    constructor(code: string, message: string, details?: unknown) {
      super(message)
      this.code = code
      this.details = details
    }
  },
}))
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
  ApiClientError: MockApiClientError,
}))

const hasMock = vi.fn(() => true)
vi.mock('../../../lib/rbac/usePermissions', () => ({
  usePermissions: () => ({ permissions: [], isLoading: false, has: hasMock }),
}))

const handlers: Record<string, (p: unknown) => void> = {}
vi.mock('../../../lib/ws/useWsEvent', () => ({
  useWsEvent: (type: string, handler: (p: unknown) => void) => {
    handlers[type] = handler
  },
}))
function fire(type: string, payload: unknown) {
  act(() => handlers[type]!(payload))
}

function renderThread() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ChatThread conversationId="conv-1" contextId="ctx-1" />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ChatThread', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    for (const k of Object.keys(handlers)) delete handlers[k]
    getMock.mockResolvedValue({ messages: [] })
    postMock.mockResolvedValue({ message: { messageId: 'u1', role: 'user', content: 'hello' } })
  })

  it('sends a message, shows thinking, then streams the assistant reply', async () => {
    renderThread()
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())

    await userEvent.type(screen.getByRole('textbox'), 'hello')
    await userEvent.keyboard('{Enter}')

    // The user's message shows immediately (optimistic) and the assistant is "thinking".
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Assistant is thinking' })).toBeInTheDocument()
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/conversations/conv-1/messages', { content: 'hello' }))

    // Tokens stream in.
    fire('chat_delta', { conversationId: 'conv-1', messageId: 'a1', delta: 'Streamed ' })
    fire('chat_delta', { conversationId: 'conv-1', messageId: 'a1', delta: 'reply' })
    await waitFor(() => expect(screen.getByText('Streamed reply')).toBeInTheDocument())

    // Completing triggers a history refetch.
    getMock.mockClear()
    fire('chat_complete', { conversationId: 'conv-1', messageId: 'a1' })
    await waitFor(() => expect(getMock).toHaveBeenCalled())
  })

  it('renders a failed turn with a Retry affordance', async () => {
    renderThread()
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())
    await userEvent.type(screen.getByRole('textbox'), 'hello')
    await userEvent.keyboard('{Enter}')

    fire('chat_failed', { conversationId: 'conv-1', messageId: 'a1', error: 'model unavailable' })
    await waitFor(() => expect(screen.getByText('model unavailable')).toBeInTheDocument())
    expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0)
  })

  it('surfaces the ledger gate on LEDGER_GATED and can send anyway', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === '/contexts/ctx-1/ledger') {
        return Promise.resolve({
          entries: [
            {
              entryId: '11111111-1111-4111-8111-111111111111', contextId: 'ctx-1', topic: 'Auth provider', answer: null,
              status: 'open', confidence: 0, origin: 'auto', sourceRefs: [],
              createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
            },
          ],
        })
      }
      return Promise.resolve({ messages: [] })
    })
    postMock.mockRejectedValueOnce(
      new MockApiClientError(LEDGER_GATED_ERROR_CODE, 'gated', {
        blockingEntries: [{ entryId: '11111111-1111-4111-8111-111111111111', topic: 'Auth provider', status: 'open' }],
      }),
    )
    renderThread()
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())
    await userEvent.type(screen.getByRole('textbox'), 'hello')
    await userEvent.keyboard('{Enter}')

    // The gate banner appears (no error toast) listing the blocking topic — not a plain toast.
    expect(await screen.findByText('This context has unsettled decisions')).toBeInTheDocument()
    expect(screen.getByText('Auth provider')).toBeInTheDocument()

    // "Send anyway" resends with the bypass flag.
    postMock.mockResolvedValueOnce({ message: { messageId: 'u1', role: 'user', content: 'hello' } })
    await userEvent.click(screen.getByRole('button', { name: 'Send anyway' }))
    await waitFor(() =>
      expect(postMock).toHaveBeenLastCalledWith('/conversations/conv-1/messages', {
        content: 'hello',
        bypassLedgerGating: true,
      }),
    )
  })
})
