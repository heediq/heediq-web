import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FolderTree } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No contexts yet" description="Create your first one" />)
    expect(screen.getByText('No contexts yet')).toBeInTheDocument()
    expect(screen.getByText('Create your first one')).toBeInTheDocument()
  })

  it('omits the description when not provided', () => {
    render(<EmptyState title="Nothing here" />)
    expect(screen.queryByText('Create your first one')).not.toBeInTheDocument()
  })

  it('renders the action slot and a custom icon', () => {
    render(
      <EmptyState title="Empty" icon={FolderTree} action={<button>Create</button>} />,
    )
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })
})
