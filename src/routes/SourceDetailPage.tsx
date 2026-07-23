import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ListChecks } from 'lucide-react'
import type { SourceStatus, SourceClassification, WsEventPayloadMap } from '@heediq/shared'
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../components/ui'
import { useWsEvent } from '../lib/ws/useWsEvent'
import { ExtractedItemsList } from '../features/sources/ExtractedItemsList'
import { useSource, useSourceSummary, useSourceItems, sourceKeys } from '../features/sources/sources-api'

const STATUS_TONE: Record<SourceStatus, 'neutral' | 'active' | 'success' | 'danger'> = {
  uploading: 'neutral',
  processing: 'active',
  ready: 'success',
  failed: 'danger',
}

const CLASSIFICATION_TONE: Record<SourceClassification, 'active' | 'success'> = {
  pending_review: 'active',
  approved: 'success',
}

export function SourceDetailPage() {
  const { sourceId = '' } = useParams<{ sourceId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const queryClient = useQueryClient()
  const sourceQuery = useSource(sourceId)
  const summaryQuery = useSourceSummary(sourceId)
  const itemsQuery = useSourceItems(sourceId)

  // Ingest classification lands async (D-111/D-133) — when it does for this source, refresh so the
  // Review affordance + extracted items appear without a reload or polling.
  useWsEvent(
    'classification_ready',
    useCallback(
      (payload: WsEventPayloadMap['classification_ready']) => {
        if (payload.sourceId !== sourceId) return
        void queryClient.invalidateQueries({ queryKey: sourceKeys.detail(sourceId) })
        void queryClient.invalidateQueries({ queryKey: sourceKeys.items(sourceId) })
        void queryClient.invalidateQueries({ queryKey: sourceKeys.summary(sourceId) })
      },
      [queryClient, sourceId],
    ),
  )

  if (sourceQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (sourceQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <ErrorState
          title={t('sourceDetail.loadError.title')}
          description={t('sourceDetail.loadError.description')}
          onRetry={() => void sourceQuery.refetch()}
        />
      </div>
    )
  }

  const source = sourceQuery.data.source
  const summary = summaryQuery.data?.summary ?? null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate('/sources')}>
          <ArrowLeft className="size-4" /> {t('sourceDetail.back')}
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-display text-text-primary">{source.title}</h1>
          {source.classification === 'pending_review' ? (
            <Button size="sm" onClick={() => navigate(`/sources/${sourceId}/review`)}>
              <ListChecks className="size-4" /> {t('sourceDetail.review')}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[source.status]}>{t(`sourceStatus.${source.status}`)}</Badge>
          {source.classification ? (
            <Badge tone={CLASSIFICATION_TONE[source.classification]}>
              {t(`sourceClassification.${source.classification}`)}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Gist */}
      <section className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-primary">{t('sourceDetail.gist')}</h2>
        {summaryQuery.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : summary?.gist ? (
          <p className="text-body text-text-secondary">{summary.gist}</p>
        ) : (
          <p className="text-caption text-text-secondary">{t('sourceDetail.gistUnavailable')}</p>
        )}
      </section>

      {/* Extracted items */}
      <section className="flex flex-col gap-3">
        <h2 className="text-h2 text-text-primary">{t('sourceDetail.extractedItems')}</h2>
        {itemsQuery.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : itemsQuery.isError ? (
          <ErrorState
            title={t('sourceDetail.itemsError.title')}
            onRetry={() => void itemsQuery.refetch()}
          />
        ) : itemsQuery.data.items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={t('sourceDetail.noItems.title')}
            description={t('sourceDetail.noItems.description')}
          />
        ) : (
          <ExtractedItemsList items={itemsQuery.data.items} />
        )}
      </section>

      {/* Transcript */}
      <section className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-primary">{t('sourceDetail.transcript')}</h2>
        {summaryQuery.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : summary?.transcript ? (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-1 p-4 font-mono text-mono-transcript text-text-primary">
            {summary.transcript}
          </pre>
        ) : (
          <p className="text-caption text-text-secondary">{t('sourceDetail.transcriptUnavailable')}</p>
        )}
      </section>
    </div>
  )
}
