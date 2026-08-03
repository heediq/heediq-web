import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateLedgerEntryRequest,
  DecisionLedgerEntry,
  UpdateLedgerEntryRequest,
} from '@heediq/shared'
import { apiClient } from '../../lib/api-client'

/**
 * React Query access to a Context's Decision Ledger (D-136/D-148/D-149). The API keys the ledger by
 * `contextId` (PK), so every hook is scoped to one Context. Writes reuse the `context:update`
 * permission on the backend; the UI additionally gates the controls with `<Can>` (D-102).
 */
export const ledgerKeys = {
  all: ['ledger'] as const,
  list: (contextId: string) => ['ledger', contextId] as const,
}

export function useLedger(contextId: string | undefined) {
  return useQuery({
    queryKey: ledgerKeys.list(contextId ?? '∅'),
    queryFn: () => apiClient.get<{ entries: DecisionLedgerEntry[] }>(`/contexts/${contextId}/ledger`),
    enabled: !!contextId,
  })
}

export function useCreateLedgerEntry(contextId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateLedgerEntryRequest) =>
      apiClient.post<DecisionLedgerEntry>(`/contexts/${contextId}/ledger`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ledgerKeys.list(contextId) }),
  })
}

export function useUpdateLedgerEntry(contextId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: UpdateLedgerEntryRequest }) =>
      apiClient.patch<DecisionLedgerEntry>(`/contexts/${contextId}/ledger/${entryId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ledgerKeys.list(contextId) }),
  })
}

export function useDeleteLedgerEntry(contextId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) =>
      apiClient.delete<{ entryId: string }>(`/contexts/${contextId}/ledger/${entryId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ledgerKeys.list(contextId) }),
  })
}
