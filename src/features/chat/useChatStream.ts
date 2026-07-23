import { useCallback, useRef, useState } from 'react'
import type { WsEventPayloadMap } from '@heediq/shared'
import { useWsEvent } from '../../lib/ws/useWsEvent'

export interface PendingTurn {
  /** The assistant message id once the first delta/complete/failed arrives; null while only thinking. */
  messageId: string | null
  text: string
  status: 'thinking' | 'streaming' | 'done' | 'failed'
  error?: string
}

/**
 * Assembles a streaming assistant turn for one conversation from the WS events (D-139/D-145):
 * `chat_delta` (append), `chat_complete` (finalize + trigger a history refetch via `onComplete`),
 * `chat_failed` (surface an error with Retry). Drives the §6 chat bar: `begin()` shows the thinking
 * indicator the instant the user sends, before the first token.
 *
 * Rendering dedupes on `messageId`: a `done` turn keeps showing its assembled text until the refetched
 * history includes that id, so there's no flash between the streamed text and the persisted message.
 * `stop()` is a client-side halt — it stops applying further tokens for the current turn (the server
 * has no cancel yet; see the chat README / engineering backlog).
 */
export function useChatStream(conversationId: string | undefined, onComplete: () => void) {
  const [pending, setPending] = useState<PendingTurn | null>(null)
  const stopped = useRef<Set<string>>(new Set())

  const begin = useCallback(() => {
    setPending({ messageId: null, text: '', status: 'thinking' })
  }, [])

  const reset = useCallback(() => setPending(null), [])

  const stop = useCallback(() => {
    setPending((prev) => {
      if (!prev || (prev.status !== 'streaming' && prev.status !== 'thinking')) return prev
      if (prev.messageId) stopped.current.add(prev.messageId)
      return { ...prev, status: 'done' }
    })
  }, [])

  useWsEvent(
    'chat_delta',
    useCallback(
      (p: WsEventPayloadMap['chat_delta']) => {
        if (p.conversationId !== conversationId || stopped.current.has(p.messageId)) return
        setPending((prev) => ({
          messageId: p.messageId,
          text: (prev?.text ?? '') + p.delta,
          status: 'streaming',
        }))
      },
      [conversationId],
    ),
  )

  useWsEvent(
    'chat_complete',
    useCallback(
      (p: WsEventPayloadMap['chat_complete']) => {
        if (p.conversationId !== conversationId || stopped.current.has(p.messageId)) return
        setPending((prev) => (prev ? { ...prev, messageId: p.messageId, status: 'done' } : prev))
        onComplete()
      },
      [conversationId, onComplete],
    ),
  )

  useWsEvent(
    'chat_failed',
    useCallback(
      (p: WsEventPayloadMap['chat_failed']) => {
        if (p.conversationId !== conversationId) return
        setPending({ messageId: p.messageId, text: '', status: 'failed', error: p.error })
      },
      [conversationId],
    ),
  )

  return { pending, begin, stop, reset }
}
