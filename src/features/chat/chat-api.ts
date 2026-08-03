import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChatMessage, Conversation } from '@heediq/shared'
import { apiClient } from '../../lib/api-client'

export const chatKeys = {
  conversations: (contextId: string) => ['conversations', contextId] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
}

export function useConversations(contextId: string) {
  return useQuery({
    queryKey: chatKeys.conversations(contextId),
    queryFn: () =>
      apiClient.get<{ conversations: Conversation[] }>(`/conversations?contextId=${contextId}`),
  })
}

export function useCreateConversation(contextId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (title: string) =>
      apiClient.post<{ conversation: Conversation }>(`/conversations?contextId=${contextId}`, { title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversations(contextId) }),
  })
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? '∅'),
    queryFn: () => apiClient.get<{ messages: ChatMessage[] }>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  })
}

export function usePostMessage(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    // `bypassLedgerGating` skips the D-149 unsettled-decisions gate for this one send; omitted from the
    // body unless set so the default request stays unchanged.
    mutationFn: ({ content, bypassLedgerGating }: { content: string; bypassLedgerGating?: boolean }) =>
      apiClient.post<{ message: ChatMessage }>(`/conversations/${conversationId}/messages`, {
        content,
        ...(bypassLedgerGating ? { bypassLedgerGating: true } : {}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) }),
  })
}
