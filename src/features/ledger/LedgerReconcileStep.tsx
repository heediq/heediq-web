import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { Button, Callout, EmptyState, ErrorState, Skeleton, Spinner } from '../../components/ui'
import { useWsEvent } from '../../lib/ws/useWsEvent'
import { LedgerEntryRow } from './LedgerEntryRow'
import { useLedger } from './ledger-api'

interface LedgerReconcileStepProps {
  contextId: string
  sourceId: string
  onFinish: () => void
}

/** How long to wait for the `ledger_ready` WS event before offering to leave and reconcile later. */
const RECONCILE_TIMEOUT_MS = 90_000

/**
 * Review wizard step 3 (D-137): after the source is filed, the ledger worker reconciles decisions
 * asynchronously (D-148) and pushes `ledger_ready`. We wait inline with a visible progress state, then
 * surface the entries that still need input (`open` / `needs_review`) for the reviewer to fill on the
 * spot — reusing the standing view's `LedgerEntryRow` + hooks. Filling is optional; "Done" leaves any
 * time, and the standing ledger keeps the rest.
 */
export function LedgerReconcileStep({ contextId, sourceId, onFinish }: LedgerReconcileStepProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<'reconciling' | 'ready' | 'timedOut'>('reconciling')

  // The list is only fetched once reconciliation is done — before that there is nothing to show.
  const ledgerQuery = useLedger(phase === 'ready' ? contextId : undefined)

  const handleReady = useCallback(
    (payload: { contextId: string; sourceId: string; entryCount: number }) => {
      if (payload.contextId !== contextId || payload.sourceId !== sourceId) return
      setPhase('ready')
    },
    [contextId, sourceId],
  )
  useWsEvent('ledger_ready', handleReady)

  useEffect(() => {
    if (phase !== 'reconciling') return
    const timer = setTimeout(() => setPhase('timedOut'), RECONCILE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [phase])

  if (phase === 'reconciling') {
    return (
      <div className="flex flex-col gap-4">
        <Callout tone="info" title={t('reviewWizard.reconcile.heading')} icon={null}>
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <span>{t('reviewWizard.reconcile.description')}</span>
          </div>
        </Callout>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onFinish}>
            {t('reviewWizard.reconcile.finishLater')}
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'timedOut') {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState
          title={t('reviewWizard.reconcile.timeout.title')}
          description={t('reviewWizard.reconcile.timeout.description')}
          onRetry={() => setPhase('reconciling')}
        />
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onFinish}>
            {t('reviewWizard.reconcile.finishLater')}
          </Button>
        </div>
      </div>
    )
  }

  if (ledgerQuery.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (ledgerQuery.isError) {
    return (
      <ErrorState
        title={t('ledger.loadError.title')}
        description={t('ledger.loadError.description')}
        onRetry={() => void ledgerQuery.refetch()}
      />
    )
  }

  const needsInput = ledgerQuery.data.entries.filter(
    (e) => e.status === 'open' || e.status === 'needs_review',
  )

  return (
    <div className="flex flex-col gap-4">
      {needsInput.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t('reviewWizard.reconcile.ready.allSettled')}
          description={t('reviewWizard.reconcile.ready.allSettledDescription')}
        />
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-body font-medium text-text-primary">
              {t('reviewWizard.reconcile.ready.title')}
            </p>
            <p className="text-body text-text-secondary">{t('reviewWizard.reconcile.ready.intro')}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {needsInput.map((entry) => (
              <LedgerEntryRow key={entry.entryId} contextId={contextId} entry={entry} />
            ))}
          </ul>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={onFinish}>{t('reviewWizard.reconcile.ready.done')}</Button>
      </div>
    </div>
  )
}
