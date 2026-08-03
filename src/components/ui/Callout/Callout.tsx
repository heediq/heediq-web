import type { HTMLAttributes, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, Info, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '../../../lib/cn'

// Tones reuse existing semantic tokens (D-072) — there are deliberately no warning/info tokens, so
// `warning` (attention, not error) maps to the amber accent, matching "in-progress/active" usage.
const calloutVariants = cva('flex gap-3 rounded-md border p-3', {
  variants: {
    tone: {
      warning: 'border-accent-border bg-accent-bg',
      danger: 'border-danger-border bg-danger-bg',
      info: 'border-border bg-surface-2',
    },
  },
  defaultVariants: {
    tone: 'warning',
  },
})

const iconTone: Record<NonNullable<VariantProps<typeof calloutVariants>['tone']>, string> = {
  warning: 'text-accent',
  danger: 'text-danger',
  info: 'text-text-secondary',
}

const defaultIcon: Record<NonNullable<VariantProps<typeof calloutVariants>['tone']>, LucideIcon> = {
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
}

export interface CalloutProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof calloutVariants> {
  title?: ReactNode
  /** Override the tone's default icon. Pass `null` to omit the icon entirely. */
  icon?: LucideIcon | null
}

/**
 * An inline banner for surfacing an actionable state next to content — a ledger gate (D-149), a
 * reconciliation prompt (D-137 step 3), etc. Distinct from `ErrorState` (a full-region fallback for a
 * failed fetch): a Callout sits within a flow and holds arbitrary children (fields, buttons).
 */
export function Callout({ tone, title, icon, className, children, ...props }: CalloutProps) {
  const resolvedTone = tone ?? 'warning'
  const Icon = icon === null ? null : (icon ?? defaultIcon[resolvedTone])
  return (
    <div role="status" className={cn(calloutVariants({ tone }), className)} {...props}>
      {Icon ? <Icon className={cn('mt-0.5 size-4 shrink-0', iconTone[resolvedTone])} aria-hidden="true" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {title ? <p className="text-body font-medium text-text-primary">{title}</p> : null}
        {children ? <div className="text-body text-text-secondary">{children}</div> : null}
      </div>
    </div>
  )
}
