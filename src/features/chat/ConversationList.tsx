import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button, EmptyState, ErrorState, Skeleton } from '../../components/ui'
import { cn } from '../../lib/cn'
import { useConversations } from './chat-api'

interface ConversationListProps {
  contextId: string
  selectedId?: string
  onSelect: (id: string) => void
  onNew: () => void
  creating?: boolean
}

export function ConversationList({ contextId, selectedId, onSelect, onNew, creating }: ConversationListProps) {
  const { t } = useTranslation()
  const query = useConversations(contextId)

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h2 text-text-primary">{t('chat.conversations')}</h2>
        <Button size="sm" onClick={onNew} loading={creating}>
          <Plus className="size-4" /> {t('chat.newChat')}
        </Button>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title={t('chat.conversationsError')} onRetry={() => void query.refetch()} />
      ) : query.data.conversations.length === 0 ? (
        <EmptyState
          title={t('chat.noConversations.title')}
          description={t('chat.noConversations.description')}
          action={<Button onClick={onNew} loading={creating}>{t('chat.newChat')}</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {query.data.conversations.map((c) => (
            <li key={c.conversationId}>
              <button
                type="button"
                onClick={() => onSelect(c.conversationId)}
                className={cn(
                  'w-full truncate rounded-sm px-2 py-2 text-left text-body transition-colors duration-fast ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  c.conversationId === selectedId
                    ? 'bg-accent-bg text-accent'
                    : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
                )}
              >
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
