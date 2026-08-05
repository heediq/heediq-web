import { Check } from 'lucide-react'
import { cn } from '../../../lib/cn'

export interface StepperStep {
  id: string
  label: string
}

export interface StepperProps {
  steps: StepperStep[]
  /** Zero-based index of the active step. Steps before it render as completed. */
  current: number
  /** Accessible name for the step list (a `t()` string), e.g. "Review progress". */
  'aria-label': string
  className?: string
}

/**
 * A horizontal step indicator for multi-step flows (the review wizard, D-137). Presentational only —
 * the parent owns which step is active and all navigation. Completed steps (index &lt; current) show a
 * check; the current step is accented and carries `aria-current="step"`.
 */
export function Stepper({ steps, current, className, 'aria-label': ariaLabel }: StepperProps) {
  return (
    <ol aria-label={ariaLabel} className={cn('flex items-center', className)}>
      {steps.map((step, index) => {
        const completed = index < current
        const active = index === current
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center last:flex-none">
            <div className="flex min-w-0 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-base ease-brand',
                  completed && 'border-accent bg-accent text-surface-0',
                  active && 'border-accent text-accent',
                  !completed && !active && 'border-border text-text-secondary',
                )}
              >
                {completed ? <Check className="size-4" aria-hidden="true" /> : index + 1}
              </span>
              {/* Mobile-first (UI-kit §7): labels can't force horizontal overflow. On narrow screens
                  only the active step keeps its label (the rest read as numbered dots); the label
                  itself truncates rather than pushing the row past the viewport. */}
              <span
                className={cn(
                  'truncate text-caption font-medium',
                  active ? 'text-text-primary' : 'text-text-secondary max-sm:hidden',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'mx-2 h-px flex-1 transition-colors duration-base ease-brand',
                  completed ? 'bg-accent' : 'bg-border',
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
