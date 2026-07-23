import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  /** Icon to show above the title. Defaults to an inbox. Pass any lucide icon component. */
  icon?: LucideIcon
  /** Primary action slot — pass a kit `Button` (keeps its copy in the caller via `t()`). */
  action?: ReactNode
}

/**
 * Designed empty branch for a data surface, per `04-loading-and-feedback.md` §9 — distinct from
 * loading (Skeleton) and error (ErrorState). Empty ≠ loading: genuinely-no-data shows a short
 * explanation and a primary action, never a bare blank region.
 */
export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <Icon className="size-8 text-text-secondary" aria-hidden="true" />
      <p className="text-h2 text-text-primary">{title}</p>
      {description ? <p className="text-body text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
