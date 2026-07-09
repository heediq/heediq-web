import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../../components/ui'
import { GroupsPanel } from '../GroupsPanel'

const getMock = vi.fn()
const postMock = vi.fn()
const patchMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
  ApiClientError: class extends Error {},
}))

const role = { roleId: 'role-1', orgId: 'org-1', name: 'Reviewer', permissions: [], isSystemRole: false }
const group = { groupId: 'group-1', orgId: 'org-1', name: 'Reviewers', roleIds: ['role-1'] }

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <GroupsPanel />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

function mockGroupsAndRoles(groups: (typeof group)[]) {
  getMock.mockImplementation((path: string) => {
    if (path === '/groups') return Promise.resolve({ groups })
    if (path === '/roles') return Promise.resolve({ roles: [role] })
    throw new Error(`unexpected path ${path}`)
  })
}

describe('GroupsPanel', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    patchMock.mockReset()
    deleteMock.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('shows an error state with retry when the groups fetch fails', async () => {
    getMock.mockImplementation((path: string) =>
      path === '/groups' ? Promise.reject(new Error('boom')) : Promise.resolve({ roles: [] }),
    )
    renderPanel()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load groups.')
  })

  it('lists groups with their role count', async () => {
    mockGroupsAndRoles([group])
    renderPanel()

    expect(await screen.findByText('Reviewers')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('creates a group from a checked role and shows a success toast', async () => {
    mockGroupsAndRoles([])
    postMock.mockResolvedValue({ group })
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Create group' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'Reviewers')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reviewer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/groups', { name: 'Reviewers', roleIds: ['role-1'] }))
    expect(await screen.findByText('Group created')).toBeInTheDocument()
  })

  it('deletes a group and shows a success toast', async () => {
    mockGroupsAndRoles([group])
    deleteMock.mockResolvedValue(undefined)
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('/groups/group-1'))
    expect(await screen.findByText('Group deleted')).toBeInTheDocument()
  })
})
