import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatStream } from '../useChatStream'

// Capture the handler registered for each WS event type so tests can fire events directly.
const handlers: Record<string, (p: unknown) => void> = {}
vi.mock('../../../lib/ws/useWsEvent', () => ({
  useWsEvent: (type: string, handler: (p: unknown) => void) => {
    handlers[type] = handler
  },
}))

function fire(type: string, payload: unknown) {
  act(() => handlers[type]!(payload))
}

describe('useChatStream', () => {
  beforeEach(() => {
    for (const k of Object.keys(handlers)) delete handlers[k]
  })

  it('shows thinking on begin, then assembles deltas into streaming text', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useChatStream('conv-1', onComplete))

    act(() => result.current.begin())
    expect(result.current.pending?.status).toBe('thinking')

    fire('chat_delta', { conversationId: 'conv-1', messageId: 'm1', delta: 'Hel' })
    fire('chat_delta', { conversationId: 'conv-1', messageId: 'm1', delta: 'lo' })
    expect(result.current.pending).toMatchObject({ messageId: 'm1', text: 'Hello', status: 'streaming' })
  })

  it('finalizes on complete and calls onComplete', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useChatStream('conv-1', onComplete))
    act(() => result.current.begin())
    fire('chat_delta', { conversationId: 'conv-1', messageId: 'm1', delta: 'Hi' })
    fire('chat_complete', { conversationId: 'conv-1', messageId: 'm1' })
    expect(result.current.pending?.status).toBe('done')
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('ignores events for other conversations', () => {
    const { result } = renderHook(() => useChatStream('conv-1', vi.fn()))
    act(() => result.current.begin())
    fire('chat_delta', { conversationId: 'conv-2', messageId: 'x', delta: 'nope' })
    expect(result.current.pending?.text).toBe('')
    expect(result.current.pending?.status).toBe('thinking')
  })

  it('surfaces a failed turn with the error', () => {
    const { result } = renderHook(() => useChatStream('conv-1', vi.fn()))
    act(() => result.current.begin())
    fire('chat_failed', { conversationId: 'conv-1', messageId: 'm1', error: 'boom' })
    expect(result.current.pending).toMatchObject({ status: 'failed', error: 'boom' })
  })

  it('stop halts further token application for the turn', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useChatStream('conv-1', onComplete))
    act(() => result.current.begin())
    fire('chat_delta', { conversationId: 'conv-1', messageId: 'm1', delta: 'Par' })
    act(() => result.current.stop())
    expect(result.current.pending?.status).toBe('done')
    // Late deltas + complete for the stopped turn are ignored.
    fire('chat_delta', { conversationId: 'conv-1', messageId: 'm1', delta: 'tial' })
    fire('chat_complete', { conversationId: 'conv-1', messageId: 'm1' })
    expect(result.current.pending?.text).toBe('Par')
    expect(onComplete).not.toHaveBeenCalled()
  })
})
