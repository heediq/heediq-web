import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tree, type TreeNode } from './Tree'

const nodes: TreeNode[] = [
  {
    id: 'a',
    label: 'Alpha',
    children: [
      { id: 'a1', label: 'Alpha-1' },
      { id: 'a2', label: 'Alpha-2' },
    ],
  },
  { id: 'b', label: 'Beta' },
]

describe('Tree', () => {
  it('renders top-level nodes and hides collapsed children', () => {
    render(<Tree aria-label="Library" nodes={nodes} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Alpha-1')).not.toBeInTheDocument()
  })

  it('marks the selected node with aria-selected', () => {
    render(<Tree aria-label="Library" nodes={nodes} selectedId="b" />)
    expect(screen.getByText('Beta').closest('[role="treeitem"]')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Alpha').closest('[role="treeitem"]')).toHaveAttribute('aria-selected', 'false')
  })

  it('expands on ArrowRight and reveals children', () => {
    render(<Tree aria-label="Library" nodes={nodes} />)
    const alpha = screen.getByText('Alpha').closest('[role="treeitem"]')!
    fireEvent.keyDown(alpha, { key: 'ArrowRight' })
    expect(screen.getByText('Alpha-1')).toBeInTheDocument()
    expect(alpha).toHaveAttribute('aria-expanded', 'true')
  })

  it('respects defaultExpandedIds', () => {
    render(<Tree aria-label="Library" nodes={nodes} defaultExpandedIds={['a']} />)
    expect(screen.getByText('Alpha-2')).toBeInTheDocument()
  })

  it('selects on Enter and on click', () => {
    const onSelect = vi.fn()
    render(<Tree aria-label="Library" nodes={nodes} onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByText('Alpha').closest('[role="treeitem"]')!, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('a')
    fireEvent.click(screen.getByText('Beta'))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('uses roving tabindex — exactly one row is tabbable', () => {
    render(<Tree aria-label="Library" nodes={nodes} selectedId="b" />)
    const tabbable = screen.getAllByRole('treeitem').filter((el) => el.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveAttribute('aria-selected', 'true')
  })
})
