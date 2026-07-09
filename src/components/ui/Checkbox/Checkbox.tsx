import { forwardRef, useId } from 'react'
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '../../../lib/cn'

export interface CheckboxProps extends RadixCheckbox.CheckboxProps {
  label?: string
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const autoId = useId()
    const checkboxId = id ?? autoId
    const checkbox = (
      <RadixCheckbox.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-sm border border-border bg-surface-1 ' +
            'transition-colors hover:border-text-disabled focus-visible:outline-none focus-visible:ring-2 ' +
            'focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 ' +
            'disabled:pointer-events-none disabled:opacity-50 ' +
            'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
          className
        )}
        {...props}
      >
        <RadixCheckbox.Indicator className="text-surface-0">
          <Check className="size-3.5" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
    )

    if (!label) return checkbox

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'inline-flex items-center gap-2 text-body text-text-primary',
          props.disabled && 'pointer-events-none opacity-50'
        )}
      >
        {checkbox}
        {label}
      </label>
    )
  }
)
Checkbox.displayName = 'Checkbox'
