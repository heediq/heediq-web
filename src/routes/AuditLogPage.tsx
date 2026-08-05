import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { AuditLogEntry, AuditResourceType } from '@heediq/shared'
import { Button, ErrorState, Input, Select, Table } from '../components/ui'
import { PageContainer, PageHeader } from '../components/layout'
import { apiClient } from '../lib/api-client'
import { formatDateTime } from '../lib/format'

interface AuditLogResponse {
  entries: AuditLogEntry[]
  nextCursor: string | null
}

const RESOURCE_TYPES: AuditResourceType[] = ['role', 'group', 'roleAssignment', 'groupAssignment', 'source', 'auth']

interface Filters {
  actorUserId: string
  action: string
  resourceType: string
  // Raw `<input type="datetime-local">` values (no timezone) — converted to ISO only when
  // building the request query string, so the controlled input's value always round-trips.
  from: string
  to: string
}

const EMPTY_FILTERS: Filters = { actorUserId: '', action: '', resourceType: '', from: '', to: '' }

function buildQuery(filters: Filters, cursor: string | null): string {
  const params = new URLSearchParams()
  if (filters.actorUserId) params.set('actorUserId', filters.actorUserId)
  if (filters.action) params.set('action', filters.action)
  if (filters.resourceType) params.set('resourceType', filters.resourceType)
  if (filters.from) params.set('from', new Date(filters.from).toISOString())
  if (filters.to) params.set('to', new Date(filters.to).toISOString())
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return qs ? `/org/audit-log?${qs}` : '/org/audit-log'
}

export function AuditLogPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [cursor, setCursor] = useState<string | null>(null)
  const [entries, setEntries] = useState<AuditLogEntry[]>([])

  const query = useQuery({
    queryKey: ['auditLog', filters, cursor],
    queryFn: () => apiClient.get<AuditLogResponse>(buildQuery(filters, cursor)),
  })

  // react-query v5 dropped useQuery's onSuccess — append/replace here instead. `cursor` (reset to
  // null on every filter change) is what distinguishes "first page of a new filter set" from
  // "next page of the same set."
  useEffect(() => {
    if (!query.data) return
    setEntries((prev) => (cursor ? [...prev, ...query.data.entries] : query.data.entries))
    // `cursor` deliberately excluded — it's read via closure, not a reactive trigger; re-running
    // this effect on `cursor` change (before new data arrives) would wipe `entries` prematurely.
  }, [query.data])

  function updateFilter<K extends keyof Filters>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCursor(null)
  }

  function loadMore() {
    if (query.data?.nextCursor) setCursor(query.data.nextCursor)
  }

  const resourceTypeOptions = useMemo(
    () => RESOURCE_TYPES.map((rt) => ({ value: rt, label: t(`auditLog.filters.resourceType.${rt}`) })),
    [t],
  )

  return (
    <PageContainer>
      <PageHeader title={t('auditLog.title')} />

      <div className="flex flex-wrap gap-4">
        <Input
          label={t('auditLog.filters.actorUserIdLabel')}
          placeholder={t('auditLog.filters.actorUserIdPlaceholder')}
          value={filters.actorUserId}
          onChange={(e) => updateFilter('actorUserId', e.target.value)}
        />
        <Input
          label={t('auditLog.filters.actionLabel')}
          placeholder={t('auditLog.filters.actionPlaceholder')}
          value={filters.action}
          onChange={(e) => updateFilter('action', e.target.value)}
        />
        <Select
          label={t('auditLog.filters.resourceTypeLabel')}
          placeholder={t('auditLog.filters.resourceTypePlaceholder')}
          value={filters.resourceType || undefined}
          onValueChange={(value) => updateFilter('resourceType', value)}
          options={resourceTypeOptions}
        />
        <Input
          type="datetime-local"
          label={t('auditLog.filters.fromLabel')}
          value={filters.from}
          onChange={(e) => updateFilter('from', e.target.value)}
        />
        <Input
          type="datetime-local"
          label={t('auditLog.filters.toLabel')}
          value={filters.to}
          onChange={(e) => updateFilter('to', e.target.value)}
        />
      </div>

      {query.isError ? (
        <ErrorState title={t('auditLog.loadError')} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Table
            columnCount={4}
            loading={query.isLoading}
            empty={!query.isLoading && entries.length === 0}
            emptyContent={t('auditLog.empty')}
          >
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t('auditLog.columnTimestamp')}</Table.HeaderCell>
                <Table.HeaderCell>{t('auditLog.columnActor')}</Table.HeaderCell>
                <Table.HeaderCell>{t('auditLog.columnAction')}</Table.HeaderCell>
                <Table.HeaderCell>{t('auditLog.columnResourceType')}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            {entries.length > 0 ? (
              <Table.Body>
                {entries.map((entry) => (
                  <Table.Row key={entry.eventId}>
                    <Table.Cell className="max-sm:font-medium" label={t('auditLog.columnTimestamp')}>
                      {formatDateTime(entry.timestamp)}
                    </Table.Cell>
                    <Table.Cell label={t('auditLog.columnActor')}>{entry.actorEmail}</Table.Cell>
                    <Table.Cell label={t('auditLog.columnAction')}>{entry.action}</Table.Cell>
                    <Table.Cell label={t('auditLog.columnResourceType')}>
                      {t(`auditLog.filters.resourceType.${entry.resourceType}`)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            ) : null}
          </Table>

          {query.data?.nextCursor ? (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={loadMore} loading={query.isFetching && cursor !== null}>
                {t('auditLog.loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </PageContainer>
  )
}
