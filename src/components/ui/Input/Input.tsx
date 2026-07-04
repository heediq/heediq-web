import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../../lib/cn'

const inputVariants = cva(
  'w-full rounded-sm border bg-surface-1 px-3 text-body text-text-primary placeholder:text-text-disabled ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:pointer-events-none ' +
    'disabled:opacity-50 disabled:text-text-disabled h-10',
  {
    variants: {
      invalid: {
        true: 'border-danger-border focus-visible:ring-danger',
        false: 'border-border hover:border-text-disabled',
      },
    },
    defaultVariants: {
      invalid: false,
    },
  }
)

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, disabled, required, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-caption font-medium text-text-secondary">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hintId, errorId) || undefined}
          className={cn(inputVariants({ invalid: !!error }), className)}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-caption text-text-secondary">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'
