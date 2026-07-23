import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../../components/ui'
import { ChatThread } from '../ChatThread'

const getMock = vi.fn()
const postMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
  ApiClientError: class extends Error {},
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
        <ChatThread conversationId="conv-1" />
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
})
