import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

/**
 * The one page frame every authenticated screen uses (UI-kit §3, §7). Centralises max-width,
 * horizontal gutter, and vertical rhythm so no page re-writes `mx-auto max-w-* p-8` by hand — and
 * so the mobile gutter (`px-4`) steps up on larger screens (`sm:px-6 lg:px-8`) in exactly one place.
 * Mobile-first: padding starts small and grows, never the reverse.
 */
const pageContainerVariants = cva('mx-auto flex w-full flex-col px-4 py-6 sm:px-6 sm:py-8', {
  variants: {
    // Max content width. `prose` for reading/forms, `default` for lists, `wide` for dense/table views.
    size: {
      prose: 'max-w-2xl',
      md: 'max-w-3xl',
      default: 'max-w-4xl',
      wide: 'max-w-6xl',
      full: 'max-w-none',
    },
    // Vertical gap between direct children (the page's sections). Maps to the spacing scale.
    gap: {
      4: 'gap-4',
      6: 'gap-6',
      8: 'gap-8',
    },
  },
  defaultVariants: {
    size: 'default',
    gap: 6,
  },
})

export interface PageContainerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageContainerVariants> {}

export function PageContainer({ className, size, gap, ...props }: PageContainerProps) {
  return <div className={cn(pageContainerVariants({ size, gap }), className)} {...props} />
}
