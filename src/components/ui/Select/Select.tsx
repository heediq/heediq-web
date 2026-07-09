import type { ReactNode } from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label: string
  value?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  error?: string
  id?: string
}

export function Select({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  error,
  id,
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-text-secondary">{label}</span>
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-sm border bg-surface-1 px-3 text-body ' +
              'text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
              'focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 ' +
              'disabled:pointer-events-none disabled:opacity-50 data-[placeholder]:text-text-disabled',
            error ? 'border-danger-border focus-visible:ring-danger' : 'border-border hover:border-text-disabled'
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="size-4 text-text-secondary" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-60 w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-sm border border-border bg-surface-1 shadow-lg"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RadixSelect.Item
      value={value}
      className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-body text-text-primary outline-none data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator>
        <Check className="size-4 text-accent" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  )
}
