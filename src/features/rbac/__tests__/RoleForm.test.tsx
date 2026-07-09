import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RoleForm } from '../RoleForm'

const systemRole = {
  roleId: 'role-1',
  orgId: 'org-1',
  name: 'admin',
  permissions: ['sources:read'] as const,
  isSystemRole: true,
}

describe('RoleForm', () => {
  it('requires a name before submitting', async () => {
    const onSubmit = vi.fn()
    render(<RoleForm open onOpenChange={vi.fn()} onSubmit={onSubmit} submitting={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the trimmed name and checked permissions', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<RoleForm open onOpenChange={vi.fn()} onSubmit={onSubmit} submitting={false} />)

    await userEvent.type(screen.getByLabelText('Name'), '  Reviewer  ')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Read own sources' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Reviewer', permissions: ['sources:read-own'] })
  })

  it('disables all fields for a system role', () => {
    render(
      <RoleForm
        open
        onOpenChange={vi.fn()}
        role={systemRole as unknown as Parameters<typeof RoleForm>[0]['role']}
        onSubmit={vi.fn()}
        submitting={false}
      />,
    )

    expect(screen.getByLabelText('Name')).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Read all sources' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
