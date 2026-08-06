import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button, EmptyState, ErrorState, Input, Skeleton, useToast } from '../../components/ui'
import { Can } from '../../lib/rbac/Can'
import { track } from '../../lib/analytics/analytics'
import { useAsyncAction } from '../../lib/useAsyncAction'
import { LedgerEntryRow } from './LedgerEntryRow'
import { useCreateLedgerEntry, useLedger } from './ledger-api'

interface LedgerSectionProps {
  contextId: string
}

/**
 * The standing Decision Ledger for a Context (D-136), embedded in the context detail panel. Three
 * data branches per `04-loading-and-feedback.md` §10: loading (skeleton) · content/empty · error
 * (retry). Adding an entry needs only a topic (open by default); answers are filled per-row.
 */
export function LedgerSection({ contextId }: LedgerSectionProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const query = useLedger(contextId)
  const createMutation = useCreateLedgerEntry(contextId)

  useEffect(() => {
    track('ledger_viewed', { contextId })
  }, [contextId])

  const [adding, setAdding] = useState(false)
  const [topic, setTopic] = useState('')

  const add = useAsyncAction(async () => {
    const trimmed = topic.trim()
    if (!trimmed) return
    try {
      await createMutation.mutateAsync({ topic: trimmed })
      setTopic('')
      setAdding(false)
      toast.success(t('ledger.added'))
    } catch {
      toast.error(t('ledger.addError'))
    }
  })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-caption font-medium text-text-secondary">{t('ledger.heading')}</h3>
        <Can permission="context:update">
          {!adding ? (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> {t('ledger.addEntry')}
            </Button>
          ) : null}
        </Can>
      </div>

      {adding ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-1 p-3">
          <Input
            label={t('ledger.topicLabel')}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('ledger.topicPlaceholder')}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" loading={add.pending} disabled={!topic.trim()} onClick={() => void add.run()}>
              {t('ledger.createEntry')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTopic('')
                setAdding(false)
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : null}

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState title={t('ledger.loadError.title')} description={t('ledger.loadError.description')} onRetry={() => void query.refetch()} />
      ) : query.data.entries.length === 0 ? (
        <EmptyState title={t('ledger.empty.title')} description={t('ledger.empty.description')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {query.data.entries.map((entry) => (
            <LedgerEntryRow key={entry.entryId} contextId={contextId} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  )
}
