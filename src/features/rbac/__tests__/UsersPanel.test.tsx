import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../../components/ui'
import { UsersPanel } from '../UsersPanel'

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
const role = { roleId: 'role-1', orgId: 'org-1', name: 'Reviewer', permissions: [], isSystemRole: false, ...timestamps }
const group = { groupId: 'group-1', orgId: 'org-1', name: 'Reviewers', roleIds: ['role-1'], ...timestamps }

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <UsersPanel />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

function mockLists() {
  getMock.mockImplementation((path: string) => {
    if (path === '/users') return Promise.resolve({ users: [user] })
    if (path === '/roles') return Promise.resolve({ roles: [role] })
    if (path === '/groups') return Promise.resolve({ groups: [group] })
    if (path === `/users/${user.userId}/role-assignments`) return Promise.resolve({ roleAssignments: [] })
    throw new Error(`unexpected path ${path}`)
  })
}

describe('UsersPanel', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    deleteMock.mockReset()
    // Radix Select relies on DOM APIs jsdom doesn't implement.
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })

  it('shows an error state with retry when the users fetch fails', async () => {
    getMock.mockImplementation((path: string) =>
      path === '/users'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ roles: [], groups: [] }),
    )
    renderPanel()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load users.')
  })

  it('lists org users', async () => {
    mockLists()
    renderPanel()

    expect(await screen.findByText('a@heediq.com')).toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
  })

  it('opens the assignments modal for the right user and assigns a role', async () => {
    mockLists()
    postMock.mockResolvedValue({ roleAssignment: { assignmentType: 'role', roleId: role.roleId, userId: user.userId, ...timestamps } })
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Manage assignments' }))
    expect(await screen.findByText('Assignments for a@heediq.com')).toBeInTheDocument()

    await waitFor(() => expect(getMock).toHaveBeenCalledWith(`/users/${user.userId}/role-assignments`))

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Role: Reviewer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(`/users/${user.userId}/role-assignments`, {
        assignmentType: 'role',
        roleId: role.roleId,
      }),
    )
    expect(await screen.findByText('Assignment added')).toBeInTheDocument()
  })
})
