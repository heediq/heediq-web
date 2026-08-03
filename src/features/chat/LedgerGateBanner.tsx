import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { LedgerBlockingEntry } from '@heediq/shared'
import { Button, Callout, Spinner } from '../../components/ui'
import { LedgerEntryRow } from '../ledger/LedgerEntryRow'
import { useLedger } from '../ledger/ledger-api'

interface LedgerGateBannerProps {
  contextId: string
  /** The entries the server reported as blocking the send (D-149 `LedgerGatedDetails`). */
  blockingEntries: LedgerBlockingEntry[]
  /** Fired once every previously-blocking entry has settled — the caller re-sends the message. */
  onAllResolved: () => void
  /** Send the message regardless, with `bypassLedgerGating`. */
  onSendAnyway: () => void
  onDismiss: () => void
}

/**
 * Inline banner shown above the composer when a send is gated by unsettled decisions (D-149). It reuses
 * the ledger's `LedgerEntryRow` so the blocking entries can be filled in place (writes are `context:update`
 * gated there); as each settles it drops out, and once all are resolved the caller auto-retries. "Send
 * anyway" bypasses the gate for one send. Blocking status is read from the live ledger, not the stale
 * error payload, so a fill elsewhere clears the banner too.
 */
export function LedgerGateBanner({
  contextId,
  blockingEntries,
  onAllResolved,
  onSendAnyway,
  onDismiss,
}: LedgerGateBannerProps) {
  const { t } = useTranslation()
  const ledgerQuery = useLedger(contextId)

  const blockingIds = new Set(blockingEntries.map((e) => e.entryId))
  const stillBlocking = (ledgerQuery.data?.entries ?? []).filter(
    (e) => blockingIds.has(e.entryId) && (e.status === 'open' || e.status === 'needs_review'),
  )

  // Auto-retry once the blockers clear — but only after we've actually observed them, so an
  // empty first paint (ledger not yet loaded) doesn't fire a premature resend.
  const sawBlocking = useRef(false)
  useEffect(() => {
    if (!ledgerQuery.isSuccess) return
    if (stillBlocking.length > 0) sawBlocking.current = true
    else if (sawBlocking.current) onAllResolved()
  }, [ledgerQuery.isSuccess, stillBlocking.length, onAllResolved])

  return (
    <Callout tone="warning" title={t('chat.gate.title')} className="mb-3">
      <div className="flex flex-col gap-3">
        <p>{t('chat.gate.intro')}</p>

        {ledgerQuery.isPending ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Spinner size="sm" /> <span>{t('common.loading')}</span>
          </div>
        ) : stillBlocking.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {stillBlocking.map((entry) => (
              <LedgerEntryRow key={entry.entryId} contextId={contextId} entry={entry} />
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onSendAnyway}>
            {t('chat.gate.sendAnyway')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            {t('common.dismiss')}
          </Button>
        </div>
      </div>
    </Callout>
  )
}
