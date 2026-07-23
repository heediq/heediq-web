import type { HTMLAttributes } from 'react'
import { cn } from '../../../lib/cn'

export type SkeletonProps = HTMLAttributes<HTMLDivElement>

/**
 * A single shimmer placeholder block, per `04-loading-and-feedback.md` §2 — compose several to
 * mirror the eventual layout (a list row, a card, the transcript pane) rather than showing a bare
 * spinner. Size/shape it via `className` (`h-4 w-32`, `rounded-full`, …). The pulse is gated behind
 * `motion-safe`, so `prefers-reduced-motion` users get a static block (§4 / kit a11y rule).
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-sm bg-surface-2 motion-safe:animate-pulse', className)}
      {...props}
    />
  )
}
