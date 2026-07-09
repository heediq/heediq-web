import type { ReactNode } from 'react'
import type { Permission } from '@heediq/shared'
import { usePermissions } from './usePermissions'

interface CanProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

// UX-only gate — hides/shows children based on the caller's effective permissions. Renders
// nothing while ['me'] is loading to avoid a flash of a disallowed action. The real
// authorization boundary is always server-side (requirePermission()); this never substitutes
// for it.
export function Can({ permission, children, fallback = null }: CanProps) {
  const { has, isLoading } = usePermissions()

  if (isLoading) {
    return null
  }

  return has(permission) ? <>{children}</> : <>{fallback}</>
}
