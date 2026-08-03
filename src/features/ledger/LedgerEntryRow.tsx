import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import type { DecisionLedgerEntry } from '@heediq/shared'
import { Button, Input, useToast } from '../../components/ui'
import { Can } from '../../lib/rbac/Can'
import { useAsyncAction } from '../../lib/useAsyncAction'
import { LedgerStatusBadge } from './LedgerStatusBadge'
import { useDeleteLedgerEntry, useUpdateLedgerEntry } from './ledger-api'

interface LedgerEntryRowProps {
  contextId: string
  entry: DecisionLedgerEntry
}

/**
 * One Decision Ledger entry in the standing per-Context view. Writes reuse `context:update` (server)
 * and are hidden behind `<Can permission="context:update">` (UX-only). Saving an answer PATCHes
 * `{ answer }` and lets the API derive the status (null → open, else confirmed, D-136); clearing the
 * answer reopens the entry.
 */
export function LedgerEntryRow({ contextId, entry }: LedgerEntryRowProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const updateMutation = useUpdateLedgerEntry(contextId)
  const deleteMutation = useDeleteLedgerEntry(contextId)

  const [editing, setEditing] = useState(false)
  const [answer, setAnswer] = useState(entry.answer ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const save = useAsyncAction(async () => {
    const trimmed = answer.trim()
    try {
      await updateMutation.mutateAsync({ entryId: entry.entryId, body: { answer: trimmed === '' ? null : trimmed } })
      setEditing(false)
      toast.success(t('ledger.saved'))
    } catch {
      toast.error(t('ledger.saveError'))
    }
  })

  const remove = useAsyncAction(async () => {
    try {
      await deleteMutation.mutateAsync(entry.entryId)
      toast.success(t('ledger.deleted'))
    } catch {
      toast.error(t('ledger.deleteError'))
    }
  })

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface-1 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-body font-medium text-text-primary">{entry.topic}</p>
        <LedgerStatusBadge status={entry.status} />
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <Input
            label={t('ledger.answerLabel')}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t('ledger.answerPlaceholder')}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" loading={save.pending} onClick={() => void save.run()}>
              <Check className="size-4" /> {t('common.save')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAnswer(entry.answer ?? '')
                setEditing(false)
              }}
            >
              <X className="size-4" /> {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3">
          {entry.answer ? (
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-body text-text-secondary">{entry.answer}</p>
          ) : (
            <p className="min-w-0 flex-1 text-body italic text-text-disabled">{t('ledger.noAnswer')}</p>
          )}
          <Can permission="context:update">
            <div className="flex shrink-0 items-center gap-1">
              {confirmingDelete ? (
                <>
                  <span className="text-caption text-text-secondary">{t('ledger.confirmDelete')}</span>
                  <Button size="sm" variant="danger" loading={remove.pending} onClick={() => void remove.run()}>
                    {t('common.delete')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                    {t('common.cancel')}
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil className="size-4" /> {entry.answer ? t('common.edit') : t('ledger.answer')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmingDelete(true)}
                    aria-label={t('ledger.deleteEntry')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </Can>
        </div>
      )}
    </li>
  )
}
