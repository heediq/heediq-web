import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Button, EmptyState, useToast } from '../components/ui'
import { cn } from '../lib/cn'
import { useContextDetail } from '../features/contexts/contexts-api'
import { ConversationList } from '../features/chat/ConversationList'
import { ChatThread } from '../features/chat/ChatThread'
import { useConversations, useCreateConversation } from '../features/chat/chat-api'

export function ContextChatPage() {
  const { contextId = '' } = useParams<{ contextId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()

  const contextQuery = useContextDetail(contextId)
  const conversationsQuery = useConversations(contextId)
  const createConversation = useCreateConversation(contextId)

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  // Auto-select the most recent conversation once loaded.
  useEffect(() => {
    if (!selectedId && conversationsQuery.data?.conversations.length) {
      setSelectedId(conversationsQuery.data.conversations[0]!.conversationId)
    }
  }, [selectedId, conversationsQuery.data])

  function newChat() {
    createConversation.mutate(t('chat.newChatTitle'), {
      onSuccess: ({ conversation }) => setSelectedId(conversation.conversationId),
      onError: () => toast.error(t('chat.createError')),
    })
  }

  const contextName = contextQuery.data?.context.name

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/contexts/${contextId}`)}>
          <ArrowLeft className="size-4" /> {t('chat.backToContext')}
        </Button>
        {contextName ? <span className="truncate text-body text-text-secondary">{contextName}</span> : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className={cn(
            'border-border md:w-72 md:shrink-0 md:border-r',
            selectedId ? 'hidden md:block' : 'block',
          )}
        >
          <ConversationList
            contextId={contextId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNew={newChat}
            creating={createConversation.isPending}
          />
        </aside>

        <section className={cn('min-h-0 min-w-0 flex-1', selectedId ? 'flex flex-col' : 'hidden md:flex md:flex-col')}>
          {selectedId ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedId(undefined)}
                className="flex items-center gap-1 border-b border-border px-4 py-2 text-caption text-text-secondary md:hidden"
              >
                <ArrowLeft className="size-4" /> {t('chat.backToConversations')}
              </button>
              <ChatThread key={selectedId} conversationId={selectedId} contextId={contextId} />
            </>
          ) : (
            <div className="hidden h-full items-center justify-center md:flex">
              <EmptyState
                title={t('chat.selectConversation.title')}
                description={t('chat.selectConversation.description')}
                action={<Button onClick={newChat} loading={createConversation.isPending}>{t('chat.newChat')}</Button>}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
