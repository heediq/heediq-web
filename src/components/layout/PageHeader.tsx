import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface PageHeaderProps {
  /** The page title. Rendered with the `h1` type token (UI-kit §7 — page-title level). */
  title: ReactNode
  /** Optional supporting copy under the title. */
  description?: ReactNode
  /** Optional trailing action(s) (e.g. a primary Button). Wraps below the title on narrow screens
   * instead of colliding with it. */
  actions?: ReactNode
  className?: string
}

/**
 * The standard page title block: `h1` + optional description + optional trailing actions. Actions
 * wrap beneath the title on narrow screens (`flex-wrap`), so a title + CTA never overlaps on mobile
 * — the header equivalent of the mobile-first no-collision rule the old TopBar violated.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="text-h1 text-text-primary">{title}</h1>
        {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="max-w-prose text-body text-text-secondary">{description}</p> : null}
    </div>
  )
}
