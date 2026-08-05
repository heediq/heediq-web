import type { TdHTMLAttributes, ThHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { cn } from '../../../lib/cn'
import { fadeUpVariants, transition } from '../../../lib/motion'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  loading?: boolean
  loadingRowCount?: number
  columnCount?: number
  empty?: boolean
  emptyContent?: ReactNode
}

function TableRoot({
  className,
  loading = false,
  loadingRowCount = 3,
  columnCount = 1,
  empty = false,
  emptyContent,
  children,
  ...props
}: TableProps) {
  const reduceMotion = useReducedMotion()

  return (
    // Below `sm` the table reflows to a stack of cards (D-153): the outer frame drops away, the
    // header hides, and each row becomes its own bordered card (see TableRow/TableCell). On `sm+`
    // it's a normal table. Horizontal scroll (`overflow-x-auto`) is the >=sm fallback only —
    // primary content never scrolls sideways on mobile.
    <div className="rounded-md border border-border sm:overflow-x-auto max-sm:rounded-none max-sm:border-0">
      <table
        className={cn('w-full border-collapse text-body max-sm:block', className)}
        {...props}
      >
        {children}
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.tbody
              key="loading"
              variants={reduceMotion ? undefined : fadeUpVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
            >
              {Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Array.from({ length: columnCount }).map((__, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <div className="h-4 w-full animate-pulse rounded-sm bg-surface-2" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </motion.tbody>
          ) : empty ? (
            <motion.tbody
              key="empty"
              variants={reduceMotion ? undefined : fadeUpVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
            >
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-body text-text-secondary">
                  {emptyContent}
                </td>
              </tr>
            </motion.tbody>
          ) : null}
        </AnimatePresence>
      </table>
    </div>
  )
}

function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  // Hidden in the mobile card layout — each TableCell shows its own field label instead.
  return <thead className={cn('bg-surface-2 max-sm:hidden', className)} {...props} />
}

function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-caption font-medium text-text-secondary',
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: HTMLMotionProps<'tbody'>) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.tbody
      variants={reduceMotion ? undefined : fadeUpVariants}
      initial="initial"
      animate="animate"
      transition={transition}
      className={cn('max-sm:block', className)}
      {...props}
    />
  )
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Row behaves as a control (whole-row click/keyboard nav) — adds pointer affordance + a
   * focus-visible ring so keyboard users can see the focused row. The caller still supplies the
   * `onClick`/`role`/`tabIndex`/`onKeyDown` behavior; this is the visual layer of that pattern. */
  interactive?: boolean
}

function TableRow({ className, interactive, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-t border-border transition-colors hover:bg-surface-2/50',
        // Mobile card: the whole row becomes a self-contained bordered card (D-153).
        'max-sm:mb-3 max-sm:block max-sm:rounded-md max-sm:border max-sm:bg-surface-1 max-sm:last:mb-0',
        interactive &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
        className,
      )}
      {...props}
    />
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Field label shown before the value **only** in the mobile card layout (<640px). Omit for the
   * card's primary/title cell so it reads as a heading rather than a labeled field. */
  label?: ReactNode
}

function TableCell({ className, label, children, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'px-4 py-2.5 text-text-primary',
        // Mobile: each cell is a "Label   Value" row inside the card, divided by a hairline.
        'max-sm:flex max-sm:items-baseline max-sm:justify-between max-sm:gap-4 max-sm:border-t max-sm:border-border/60 max-sm:px-4 max-sm:py-2.5 max-sm:first:border-t-0',
        className,
      )}
      {...props}
    >
      {label != null ? (
        <>
          <span className="hidden shrink-0 text-caption font-medium text-text-secondary max-sm:inline">
            {label}
          </span>
          <span className="min-w-0 max-sm:text-right">{children}</span>
        </>
      ) : (
        children
      )}
    </td>
  )
}

export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  HeaderCell: TableHeaderCell,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
})
