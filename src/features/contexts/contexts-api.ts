import { useQuery } from '@tanstack/react-query'
import type { Context } from '@heediq/shared'
import { apiClient } from '../../lib/api-client'

/** A Context enriched with its nested children, as returned by `GET /contexts/tree`. */
export type ContextTreeNode = Context & { children: ContextTreeNode[] }

export const contextKeys = {
  all: ['contexts'] as const,
  tree: ['contexts', 'tree'] as const,
  detail: (id: string) => ['contexts', 'detail', id] as const,
}

export function useContextTree() {
  return useQuery({
    queryKey: contextKeys.tree,
    queryFn: () => apiClient.get<{ tree: ContextTreeNode[] }>('/contexts/tree'),
  })
}

export function useContextDetail(id: string | undefined) {
  return useQuery({
    queryKey: contextKeys.detail(id ?? '∅'),
    queryFn: () => apiClient.get<{ context: Context }>(`/contexts/${id}`),
    enabled: !!id,
  })
}

/** Flatten the tree to a `{ id, name }` list for parent-picker style selects (excludes `excludeId`). */
export function flattenContexts(
  nodes: ContextTreeNode[],
  excludeId?: string,
  depth = 0,
): { contextId: string; name: string; depth: number }[] {
  const out: { contextId: string; name: string; depth: number }[] = []
  for (const node of nodes) {
    if (node.contextId === excludeId) continue
    out.push({ contextId: node.contextId, name: node.name, depth })
    if (node.children.length) out.push(...flattenContexts(node.children, excludeId, depth + 1))
  }
  return out
}
