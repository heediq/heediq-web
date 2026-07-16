import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/cn'
import { Spinner } from '../Spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-sans text-body font-medium ' +
    'transition-[background-color,color,border-color,box-shadow,opacity] duration-base ease-brand ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:pointer-events-none ' +
    'disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-surface-0 hover:bg-accent-hover active:bg-accent-pressed',
        secondary:
          'bg-surface-1 text-text-primary border border-border hover:bg-surface-2 active:bg-surface-2',
        ghost: 'bg-transparent text-text-primary hover:bg-surface-1 active:bg-surface-2',
        danger: 'bg-danger text-surface-0 hover:opacity-90 active:opacity-80',
      },
      size: {
        sm: 'h-8 px-3 text-caption',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-h2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    if (asChild) {
      // Slot requires exactly one element child — never inject the loading spinner alongside it.
      return (
        <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Spinner size={size === 'lg' ? 'md' : 'sm'} /> : null}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'
