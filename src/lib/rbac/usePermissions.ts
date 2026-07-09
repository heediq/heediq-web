import { useQuery } from '@tanstack/react-query'
import type { Permission } from '@heediq/shared'
import { apiClient } from '../api-client'
import type { GetMeResponse } from './types'

interface UsePermissionsResult {
  permissions: Permission[]
  isLoading: boolean
  has: (permission: Permission) => boolean
}

// Shares the ['me'] query key/cache with SettingsPage — no duplicate fetch.
export function usePermissions(): UsePermissionsResult {
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<GetMeResponse>('/me'),
  })

  const permissions = meQuery.data?.effectivePermissions ?? []

  return {
    permissions,
    isLoading: meQuery.isLoading,
    has: (permission) => permissions.includes(permission),
  }
}
