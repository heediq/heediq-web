import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, RotateCcw } from 'lucide-react'
import {
  LEDGER_GATED_ERROR_CODE,
  LedgerGatedDetailsSchema,
  type LedgerGatedDetails,
} from '@heediq/shared'
import { Button, EmptyState, ErrorState, Skeleton, useToast } from '../../components/ui'
import { ApiClientError } from '../../lib/api-client'
import { ChatMessage } from './ChatMessage'
import { ChatComposer } from './ChatComposer'
import { LedgerGateBanner } from './LedgerGateBanner'
import { ThinkingIndicator } from './ThinkingIndicator'
import { chatKeys, useMessages, usePostMessage } from './chat-api'
import { useChatStream } from './useChatStream'
import { track } from '../../lib/analytics/analytics'

interface ChatThreadProps {
  conversationId: string
  contextId: string
}

const BOTTOM_THRESHOLD = 80

export function ChatThread({ conversationId, contextId }: ChatThreadProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const messagesQuery = useMessages(conversationId)
  const postMutation = usePostMessage(conversationId)
  const refetchMessages = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) }),
    [queryClient, conversationId],
  )
  const stream = useChatStream(conversationId, refetchMessages)

  const [optimisticUser, setOptimisticUser] = useState<string | null>(null)
  // The send blocked by unsettled decisions (D-149), if any, plus the text to resend once resolved.
  const [gate, setGate] = useState<LedgerGatedDetails | null>(null)
  const pendingText = useRef<string | null>(null)
  // User-message count at send time — the optimistic bubble clears only once the refetched history
  // actually gains a user message (not merely because a refetch happened), so it never flickers away
  // before the server reflects it.
  const sentUserBaseline = useRef(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)

  const messages = messagesQuery.data?.messages ?? []
  const pending = stream.pending
  const showPending =
    pending && (pending.messageId === null || !messages.some((m) => m.messageId === pending.messageId))

  // Clear the optimistic user bubble once the refetched history includes a new user message.
  useEffect(() => {
    if (!optimisticUser) return
    const userCount = messages.filter((m) => m.role === 'user').length
    if (userCount > sentUserBaseline.current) setOptimisticUser(null)
  }, [messages, optimisticUser])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD)
  }, [])

  // Auto-scroll on new content — but only while the user is already at the bottom (§6).
  useEffect(() => {
    if (atBottom) scrollToBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, pending?.text, pending?.status, optimisticUser, atBottom])

  function send(text: string, opts?: { bypass?: boolean }) {
    pendingText.current = text
    setGate(null)
    sentUserBaseline.current = messages.filter((m) => m.role === 'user').length
    setOptimisticUser(text)
    stream.begin()
    setAtBottom(true)
    track('chat_sent', { conversationId, contextId })
    postMutation.mutate(
      { content: text, bypassLedgerGating: opts?.bypass },
      {
        onError: (err) => {
          stream.reset()
          setOptimisticUser(null)
          // Unsettled decisions block the send (D-149) — surface the inline gate instead of a toast.
          if (err instanceof ApiClientError && err.code === LEDGER_GATED_ERROR_CODE) {
            const parsed = LedgerGatedDetailsSchema.safeParse(err.details)
            if (parsed.success) {
              setGate(parsed.data)
              return
            }
          }
          toast.error(t('chat.sendError'))
        },
      },
    )
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) send(lastUser.content)
  }

  if (messagesQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (messagesQuery.isError) {
    return (
      <div className="p-6">
        <ErrorState title={t('chat.loadError.title')} onRetry={() => void messagesQuery.refetch()} />
      </div>
    )
  }

  const isInFlight = pending?.status === 'thinking' || pending?.status === 'streaming'

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          {messages.length === 0 && !optimisticUser && !showPending ? (
            <EmptyState title={t('chat.empty.title')} description={t('chat.empty.description')} />
          ) : null}

          {messages.map((m) => (
            <ChatMessage
              key={m.messageId}
              role={m.role}
              content={m.content}
              copyable={m.role === 'assistant'}
            />
          ))}

          {optimisticUser ? <ChatMessage role="user" content={optimisticUser} /> : null}

          {showPending && pending ? (
            pending.status === 'thinking' ? (
              <div className="rounded-md border border-border bg-surface-1 px-4 py-3 self-start">
                <ThinkingIndicator />
              </div>
            ) : pending.status === 'failed' ? (
              <ErrorState
                title={t('chat.turnFailed.title')}
                description={pending.error || t('chat.turnFailed.description')}
                onRetry={retry}
                retryLabel={t('chat.retry')}
              />
            ) : (
              <ChatMessage
                role="assistant"
                content={pending.text}
                copyable={pending.status === 'done'}
              />
            )
          ) : null}
        </div>
      </div>

      {!atBottom ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            className="pointer-events-auto shadow-md"
            onClick={() => {
              scrollToBottom()
              setAtBottom(true)
            }}
          >
            <ArrowDown className="size-4" /> {t('chat.jumpToLatest')}
          </Button>
        </div>
      ) : null}

      <div className="border-t border-border p-3">
        <div className="mx-auto w-full max-w-3xl">
          {gate ? (
            <LedgerGateBanner
              contextId={contextId}
              blockingEntries={gate.blockingEntries}
              onAllResolved={() => {
                const text = pendingText.current
                setGate(null)
                if (text) send(text)
              }}
              onSendAnyway={() => {
                const text = pendingText.current
                if (text) send(text, { bypass: true })
              }}
              onDismiss={() => setGate(null)}
            />
          ) : null}
          <ChatComposer
            onSend={send}
            onStop={stream.stop}
            streaming={!!isInFlight}
            disabled={postMutation.isPending}
          />
          {pending?.status === 'failed' ? (
            <button
              type="button"
              onClick={retry}
              className="mt-2 flex items-center gap-1 text-caption text-text-secondary hover:text-text-primary"
            >
              <RotateCcw className="size-3.5" /> {t('chat.retry')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
