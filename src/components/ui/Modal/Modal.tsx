import type { HTMLAttributes, ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../../lib/cn'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  closeLabel?: string
}

// Radix Dialog gives us focus trap + Esc/overlay-click close for free.
function ModalRoot({ open, onOpenChange, children, closeLabel = 'Close' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border border-border bg-surface-1 shadow-lg focus:outline-none">
          {children}
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label={closeLabel}
              className="absolute right-3 top-3 rounded-sm p-1 text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="size-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ModalHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 px-5 pb-3 pt-5', className)} {...props} />
}

function ModalTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <Dialog.Title asChild>
      <h2 className={cn('text-h2 text-text-primary', className)} {...props} />
    </Dialog.Title>
  )
}

function ModalDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <Dialog.Description asChild>
      <p className={cn('text-caption text-text-secondary', className)} {...props} />
    </Dialog.Description>
  )
}

function ModalBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto px-5 py-2 text-body', className)} {...props} />
}

function ModalFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 border-t border-border px-5 py-4', className)}
      {...props}
    />
  )
}

export const Modal = Object.assign(ModalRoot, {
  Header: ModalHeader,
  Title: ModalTitle,
  Description: ModalDescription,
  Body: ModalBody,
  Footer: ModalFooter,
})
