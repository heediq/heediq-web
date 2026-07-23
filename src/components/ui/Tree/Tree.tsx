import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '../../../lib/cn'

export interface TreeNode {
  id: string
  label: ReactNode
  icon?: LucideIcon
  children?: TreeNode[]
}

export interface TreeProps {
  nodes: TreeNode[]
  /** Controlled selection — the currently selected node id (or none). */
  selectedId?: string
  onSelect?: (id: string) => void
  /** Node ids expanded on first render. Expansion is otherwise managed internally. */
  defaultExpandedIds?: string[]
  /** Accessible name for the tree (a `t()` string), e.g. "Context library". */
  'aria-label': string
  className?: string
}

interface FlatNode {
  node: TreeNode
  depth: number
  parentId: string | undefined
  hasChildren: boolean
  expanded: boolean
}

/** Flatten the tree into the currently-visible rows (respecting collapsed subtrees), in DOM order. */
function flatten(nodes: TreeNode[], expanded: Set<string>): FlatNode[] {
  const out: FlatNode[] = []
  const walk = (list: TreeNode[], depth: number, parentId: string | undefined) => {
    for (const node of list) {
      const hasChildren = !!node.children && node.children.length > 0
      const isExpanded = expanded.has(node.id)
      out.push({ node, depth, parentId, hasChildren, expanded: isExpanded })
      if (hasChildren && isExpanded) walk(node.children!, depth + 1, node.id)
    }
  }
  walk(nodes, 0, undefined)
  return out
}

/**
 * A keyboard-operable ARIA tree (`03-ui-kit.md` §6), used for the Context hierarchy. Roving
 * tabindex: exactly one row is tabbable; Arrow keys move focus, Right/Left expand/collapse or
 * hop to child/parent, Enter/Space selects, Home/End jump to the first/last visible row. Selection
 * is controlled; expansion is managed internally (seeded by `defaultExpandedIds`).
 */
export function Tree({
  nodes,
  selectedId,
  onSelect,
  defaultExpandedIds,
  className,
  'aria-label': ariaLabel,
}: TreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpandedIds ?? []))
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  const flat = useMemo(() => flatten(nodes, expanded), [nodes, expanded])

  // The tabbable row: the active one if still visible, else the selected one, else the first row.
  const tabbableId =
    (activeId && flat.some((f) => f.node.id === activeId) && activeId) ||
    (selectedId && flat.some((f) => f.node.id === selectedId) && selectedId) ||
    flat[0]?.node.id

  const focusRow = (id: string) => {
    setActiveId(id)
    rowRefs.current.get(id)?.focus()
  }

  const toggle = (id: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    const current = flat[index]
    if (!current) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (flat[index + 1]) focusRow(flat[index + 1]!.node.id)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (flat[index - 1]) focusRow(flat[index - 1]!.node.id)
        break
      case 'ArrowRight':
        e.preventDefault()
        if (current.hasChildren && !current.expanded) toggle(current.node.id, true)
        else if (current.hasChildren && flat[index + 1]) focusRow(flat[index + 1]!.node.id)
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (current.hasChildren && current.expanded) toggle(current.node.id, false)
        else if (current.parentId) focusRow(current.parentId)
        break
      case 'Home':
        e.preventDefault()
        if (flat[0]) focusRow(flat[0].node.id)
        break
      case 'End':
        e.preventDefault()
        if (flat[flat.length - 1]) focusRow(flat[flat.length - 1]!.node.id)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect?.(current.node.id)
        break
    }
  }

  return (
    <div role="tree" aria-label={ariaLabel} className={cn('flex flex-col', className)}>
      {flat.map((f, index) => {
        const { node, depth, hasChildren, expanded: isExpanded } = f
        const isSelected = node.id === selectedId
        const Icon = node.icon
        return (
          <div
            key={node.id}
            ref={(el) => {
              if (el) rowRefs.current.set(node.id, el)
              else rowRefs.current.delete(node.id)
            }}
            role="treeitem"
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-level={depth + 1}
            tabIndex={node.id === tabbableId ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, index)}
            onClick={() => {
              setActiveId(node.id)
              onSelect?.(node.id)
            }}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 text-body outline-none',
              'transition-colors duration-fast ease-brand',
              'focus-visible:ring-2 focus-visible:ring-accent',
              isSelected
                ? 'bg-accent-bg text-accent'
                : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
            )}
          >
            {hasChildren ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(node.id, !isExpanded)
                }}
                className="flex size-4 shrink-0 items-center justify-center text-text-secondary"
              >
                <ChevronRight
                  className={cn(
                    'size-4 transition-transform duration-fast ease-brand',
                    isExpanded && 'rotate-90',
                  )}
                />
              </button>
            ) : (
              <span className="size-4 shrink-0" aria-hidden="true" />
            )}
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
            <span className="truncate">{node.label}</span>
          </div>
        )
      })}
    </div>
  )
}
