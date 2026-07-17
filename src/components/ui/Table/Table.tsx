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
    <div className="overflow-x-auto rounded-md border border-border">
      <table className={cn('w-full border-collapse text-body', className)} {...props}>
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
  return <thead className={cn('bg-surface-2', className)} {...props} />
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
      className={cn(className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-t border-border transition-colors hover:bg-surface-2/50', className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-2.5 text-text-primary', className)} {...props} />
}

export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  HeaderCell: TableHeaderCell,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
})
