import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '../../../lib/cn'

const spinnerVariants = cva('animate-spin motion-reduce:animate-none text-accent', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-6',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string
  'aria-label'?: string
}

export function Spinner({ size, className, 'aria-label': ariaLabel = 'Loading' }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={ariaLabel}
      className={cn(spinnerVariants({ size }), className)}
    />
  )
}
