import type { HTMLAttributes } from 'react'
import { cn } from '../../../lib/cn'

function CardRoot({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-md border border-border bg-surface-1 p-4', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex flex-col gap-1', className)} {...props} />
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-h2 text-text-primary', className)} {...props} />
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-caption text-text-secondary', className)} {...props} />
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-body', className)} {...props} />
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
})
