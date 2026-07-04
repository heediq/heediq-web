import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border font-sans text-caption font-medium leading-none',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-2 text-text-secondary border-border',
        active: 'bg-accent-bg text-accent border-accent-border',
        success: 'bg-success-bg text-success border-success-border',
        danger: 'bg-danger-bg text-danger border-danger-border',
      },
      size: {
        sm: 'px-2 py-0.5 text-[12px]',
        md: 'px-2.5 py-1',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ tone, size, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}
