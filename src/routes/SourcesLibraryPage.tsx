import { useCallback, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { FileAudio } from 'lucide-react'
import type { WsEventPayloadMap } from '@heediq/shared'
import { Badge, Button, EmptyState, ErrorState, Table } from '../components/ui'
import { useWsEvent } from '../lib/ws/useWsEvent'
import { useSourcesList, sourceKeys, SOURCE_STATUS_TONE } from '../features/sources/sources-api'

export function SourcesLibraryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const query = useSourcesList()
  const sources = query.data?.pages.flatMap((page) => page.sources) ?? []

  // Ingest is async (D-111): a Source moves uploading → processing → ready and its classification
  // lands later, all pushed over the WS framework. Both events refresh the whole list so every
  // row's status badge stays live without polling — reusing the existing events (no new one, D-111).
  const refreshList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: sourceKeys.list() })
  }, [queryClient])
  useWsEvent('job_status', useCallback((_p: WsEventPayloadMap['job_status']) => refreshList(), [refreshList]))
  useWsEvent(
    'classification_ready',
    useCallback((_p: WsEventPayloadMap['classification_ready']) => refreshList(), [refreshList]),
  )

  function openSource(id: string) {
    navigate(`/sources/${id}`)
  }

  function onRowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openSource(id)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <h1 className="text-h1 text-text-primary">{t('sourcesLibrary.title')}</h1>

      {query.isError ? (
        <ErrorState
          title={t('sourcesLibrary.loadError.title')}
          description={t('sourcesLibrary.loadError.description')}
          onRetry={() => void query.refetch()}
        />
      ) : !query.isPending && sources.length === 0 ? (
        <EmptyState
          icon={FileAudio}
          title={t('sourcesLibrary.empty.title')}
          description={t('sourcesLibrary.empty.description')}
        />
      ) : (
        <>
          <Table columnCount={3} loading={query.isPending} aria-label={t('sourcesLibrary.tableLabel')}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t('sourcesLibrary.columnTitle')}</Table.HeaderCell>
                <Table.HeaderCell>{t('sourcesLibrary.columnStatus')}</Table.HeaderCell>
                <Table.HeaderCell>{t('sourcesLibrary.columnCreated')}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            {sources.length > 0 ? (
              <Table.Body>
                {sources.map((source) => (
                  <Table.Row
                    key={source.sourceId}
                    interactive
                    role="button"
                    tabIndex={0}
                    aria-label={t('sourcesLibrary.openSource', { title: source.title })}
                    onClick={() => openSource(source.sourceId)}
                    onKeyDown={(e) => onRowKeyDown(e, source.sourceId)}
                  >
                    <Table.Cell>{source.title}</Table.Cell>
                    <Table.Cell>
                      <Badge tone={SOURCE_STATUS_TONE[source.status]}>
                        {t(`sourceStatus.${source.status}`)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{new Date(source.createdAt).toLocaleString()}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            ) : null}
          </Table>

          {query.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void query.fetchNextPage()}
                loading={query.isFetchingNextPage}
              >
                {t('sourcesLibrary.loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
