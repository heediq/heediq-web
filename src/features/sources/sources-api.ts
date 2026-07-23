import { useQuery } from '@tanstack/react-query'
import type { ExtractedItem, Source, Summary } from '@heediq/shared'
import { apiClient, ApiClientError } from '../../lib/api-client'

export const sourceKeys = {
  detail: (id: string) => ['sources', 'detail', id] as const,
  summary: (id: string) => ['sources', 'summary', id] as const,
  items: (id: string) => ['sources', 'items', id] as const,
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
