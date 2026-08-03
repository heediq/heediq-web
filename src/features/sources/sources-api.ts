import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { ExtractedItem, Source, SourceStatus, Summary } from '@heediq/shared'
import { apiClient, ApiClientError } from '../../lib/api-client'

/** Badge tone per Source status — one mapping shared by the library list and the detail header. */
export const SOURCE_STATUS_TONE: Record<SourceStatus, 'neutral' | 'active' | 'success' | 'danger'> = {
  uploading: 'neutral',
  processing: 'active',
  ready: 'success',
  failed: 'danger',
}

export const sourceKeys = {
  /** The Context Library list (all loaded pages share this single key so a WS-driven
   * invalidation refetches every loaded page, keeping status badges live across the whole list). */
  list: () => ['sources', 'list'] as const,
  detail: (id: string) => ['sources', 'detail', id] as const,
  summary: (id: string) => ['sources', 'summary', id] as const,
  items: (id: string) => ['sources', 'items', id] as const,
}

interface SourcesListPage {
  sources: Source[]
  nextCursor: string | null
}

/**
 * The org's Sources, newest-first, cursor-paginated (GET /sources). An infinite query rather than a
 * per-cursor `useQuery`: it keeps all loaded pages under one cache entry, so `invalidateQueries`
 * after a `job_status`/`classification_ready` WS event refetches every page at once and status
 * badges update live no matter which page a Source is on.
 */
export function useSourcesList() {
  return useInfiniteQuery({
    queryKey: sourceKeys.list(),
    queryFn: ({ pageParam }) =>
      apiClient.get<SourcesListPage>(
        pageParam ? `/sources?cursor=${encodeURIComponent(pageParam)}` : '/sources',
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })
}

export function useSource(id: string) {
  return useQuery({
    queryKey: sourceKeys.detail(id),
    queryFn: () => apiClient.get<{ source: Source }>(`/sources/${id}`),
  })
}

/**
 * The Source's Summary (transcript + gist, D-135). The endpoint 404s until the summarizer has run,
 * which is a normal "not ready yet" state, not an error — surfaced as `summary: null` so the page
 * can show a waiting state instead of an ErrorState.
 */
export function useSourceSummary(id: string) {
  return useQuery({
    queryKey: sourceKeys.summary(id),
    queryFn: async (): Promise<{ summary: Summary | null }> => {
      try {
        return await apiClient.get<{ summary: Summary }>(`/sources/${id}/summary`)
      } catch (e) {
        if (e instanceof ApiClientError && e.code === 'NOT_FOUND') return { summary: null }
        throw e
      }
    },
  })
}

export function useSourceItems(id: string) {
  return useQuery({
    queryKey: sourceKeys.items(id),
    queryFn: () => apiClient.get<{ items: ExtractedItem[] }>(`/sources/${id}/items`),
  })
}

/** Group items by `category`, preserving first-seen category order. */
export function groupByCategory(items: ExtractedItem[]): { category: string; items: ExtractedItem[] }[] {
  const order: string[] = []
  const byCategory = new Map<string, ExtractedItem[]>()
  for (const item of items) {
    if (!byCategory.has(item.category)) {
      byCategory.set(item.category, [])
      order.push(item.category)
    }
    byCategory.get(item.category)!.push(item)
  }
  return order.map((category) => ({ category, items: byCategory.get(category)! }))
}
