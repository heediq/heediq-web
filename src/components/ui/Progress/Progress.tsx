import { cva, type VariantProps } from 'class-variance-authority'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../lib/cn'

const trackVariants = cva('w-full overflow-hidden rounded-full bg-surface-2', {
  variants: {
    size: {
      sm: 'h-1',
      md: 'h-2',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

const barVariants = cva('h-full rounded-full transition-[width] duration-base ease-brand', {
  variants: {
    tone: {
      accent: 'bg-accent',
      success: 'bg-success',
    },
  },
  defaultVariants: {
    tone: 'accent',
  },
})

export interface ProgressProps
  extends VariantProps<typeof trackVariants>,
    VariantProps<typeof barVariants> {
  /** Completion 0–100; clamped. */
  value: number
  className?: string
  /** Accessible name for the bar (e.g. "Upload progress"). */
  'aria-label'?: string
}

/**
 * A determinate progress bar (`04-loading-and-feedback.md` §5) — the single kit primitive for any
 * "we can report real percentage" wait (upload, a staged job). The fill width animates via the shared
 * `duration-base`/`ease-brand` tokens so it moves in step with the rest of the motion system, and it
 * exposes proper `progressbar` ARIA so screen readers announce the value. For indeterminate waits use
 * `Spinner` instead — this component always reflects a known fraction of completion.
 */
export function Progress({ value, size, tone, className, 'aria-label': ariaLabel }: ProgressProps) {
  const { t } = useTranslation()
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel ?? t('common.progress')}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(trackVariants({ size }), className)}
    >
      <div className={barVariants({ tone })} style={{ width: `${clamped}%` }} />
    </div>
  )
}
