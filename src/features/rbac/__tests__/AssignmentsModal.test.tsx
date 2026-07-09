import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../../components/ui'
import { AssignmentsModal } from '../AssignmentsModal'

const getMock = vi.fn()
const postMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: vi.fn(),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
  ApiClientError: class extends Error {},
}))

const timestamps = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
const user = { userId: 'user-1', orgId: 'org-1', email: 'a@heediq.com', role: 'member' as const, passwordSet: true, createdAt: timestamps.createdAt }
const otherUser = { userId: 'user-2', orgId: 'org-1', email: 'b@heediq.com', role: 'member' as const, passwordSet: true, createdAt: timestamps.createdAt }
const role = { roleId: 'role-1', orgId: 'org-1', name: 'Reviewer', permissions: [], isSystemRole: false, ...timestamps }
const group = { groupId: 'group-1', orgId: 'org-1', name: 'Reviewers', roleIds: ['role-1'], ...timestamps }
const roleAssignment = { assignmentType: 'role' as const, roleId: role.roleId, userId: user.userId, ...timestamps }

function renderModal(props: Partial<React.ComponentProps<typeof AssignmentsModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AssignmentsModal open onOpenChange={() => {}} user={user} roles={[role]} groups={[group]} {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('AssignmentsModal', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    deleteMock.mockReset()
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })

  it('fetches assignments scoped to the given user', async () => {
    getMock.mockResolvedValue({ roleAssignments: [] })
    renderModal()

    await waitFor(() => expect(getMock).toHaveBeenCalledWith(`/users/${user.userId}/role-assignments`))
  })

  it('does not fetch a different user when a second user is passed', async () => {
    getMock.mockResolvedValue({ roleAssignments: [] })
    renderModal({ user: otherUser })

    await waitFor(() => expect(getMock).toHaveBeenCalledWith(`/users/${otherUser.userId}/role-assignments`))
    expect(getMock).not.toHaveBeenCalledWith(`/users/${user.userId}/role-assignments`)
  })

  it('shows an empty state when there are no assignments', async () => {
    getMock.mockResolvedValue({ roleAssignments: [] })
    renderModal()

    expect(await screen.findByText('No roles or groups assigned yet')).toBeInTheDocument()
  })

  it('lists an existing assignment by name and removes it', async () => {
    getMock.mockResolvedValue({ roleAssignments: [roleAssignment] })
    deleteMock.mockResolvedValue(undefined)
    renderModal()

    expect(await screen.findByText('Reviewer')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith(`/users/${user.userId}/role-assignments/role/${role.roleId}`),
    )
    expect(await screen.findByText('Assignment removed')).toBeInTheDocument()
  })

  it('assigns a group to the user', async () => {
    getMock.mockResolvedValue({ roleAssignments: [] })
    postMock.mockResolvedValue({
      roleAssignment: { assignmentType: 'group', groupId: group.groupId, userId: user.userId, ...timestamps },
    })
    renderModal()

    await screen.findByText('No roles or groups assigned yet')

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Group: Reviewers' }))
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(`/users/${user.userId}/role-assignments`, {
        assignmentType: 'group',
        groupId: group.groupId,
      }),
    )
    expect(await screen.findByText('Assignment added')).toBeInTheDocument()
  })
})
