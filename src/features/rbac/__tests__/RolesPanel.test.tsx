import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../../components/ui'
import { RolesPanel } from '../RolesPanel'

const getMock = vi.fn()
const postMock = vi.fn()
const patchMock = vi.fn()
const deleteMock = vi.fn()

const { MockApiClientError } = vi.hoisted(() => ({
  MockApiClientError: class extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
  ApiClientError: MockApiClientError,
}))

const role = {
  roleId: 'role-1',
  orgId: 'org-1',
  name: 'Reviewer',
  permissions: ['sources:read'],
  isSystemRole: false,
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RolesPanel />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('RolesPanel', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    patchMock.mockReset()
    deleteMock.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('shows an error state with retry when the roles fetch fails', async () => {
    getMock.mockRejectedValue(new Error('boom'))
    renderPanel()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load roles.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('lists roles and disables delete for system roles', async () => {
    getMock.mockResolvedValue({ roles: [role, { ...role, roleId: 'role-2', name: 'admin', isSystemRole: true }] })
    renderPanel()

    expect(await screen.findByText('Reviewer')).toBeInTheDocument()
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    expect(deleteButtons[1]).toBeDisabled()
  })

  it('creates a role and shows a success toast', async () => {
    getMock.mockResolvedValue({ roles: [] })
    postMock.mockResolvedValue({ role: role })
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Create role' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'Reviewer')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Read own sources' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/roles', { name: 'Reviewer', permissions: ['sources:read-own'] }),
    )
    expect(await screen.findByText('Role created')).toBeInTheDocument()
  })

  it('surfaces the system-role-delete conflict as a specific error toast', async () => {
    getMock.mockResolvedValue({ roles: [role] })
    deleteMock.mockRejectedValue(new MockApiClientError('CONFLICT', 'nope'))
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(await screen.findByText("System roles (admin/member) can't be deleted.")).toBeInTheDocument()
  })
})
