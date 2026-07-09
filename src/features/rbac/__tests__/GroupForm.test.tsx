import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GroupForm } from '../GroupForm'

const timestamps = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }

const roles = [
  { roleId: 'role-1', orgId: 'org-1', name: 'Reviewer', permissions: [], isSystemRole: false, ...timestamps },
  { roleId: 'role-2', orgId: 'org-1', name: 'Editor', permissions: [], isSystemRole: false, ...timestamps },
]

describe('GroupForm', () => {
  it('requires a name before submitting', async () => {
    const onSubmit = vi.fn()
    render(<GroupForm open onOpenChange={vi.fn()} roles={roles} onSubmit={onSubmit} submitting={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the trimmed name and checked role ids', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<GroupForm open onOpenChange={vi.fn()} roles={roles} onSubmit={onSubmit} submitting={false} />)

    await userEvent.type(screen.getByLabelText('Name'), '  Reviewers  ')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reviewer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Reviewers', roleIds: ['role-1'] })
  })

  it('pre-checks the group existing role ids when editing', () => {
    const group = { groupId: 'group-1', orgId: 'org-1', name: 'Reviewers', roleIds: ['role-2'], ...timestamps }
    render(
      <GroupForm open onOpenChange={vi.fn()} group={group} roles={roles} onSubmit={vi.fn()} submitting={false} />,
    )

    expect(screen.getByRole('checkbox', { name: 'Editor' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Reviewer' })).not.toBeChecked()
  })
})
