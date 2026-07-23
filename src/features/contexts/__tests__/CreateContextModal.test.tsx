import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../../components/ui'
import { CreateContextModal } from '../CreateContextModal'
import type { ContextTreeNode } from '../contexts-api'

const postMock = vi.fn()
vi.mock('../../../lib/api-client', () => ({
  apiClient: { post: (...args: unknown[]) => postMock(...args) },
}))

const tree: ContextTreeNode[] = []

function renderModal(props: Partial<React.ComponentProps<typeof CreateContextModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onOpenChange = props.onOpenChange ?? vi.fn()
  const onCreated = props.onCreated ?? vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CreateContextModal open onOpenChange={onOpenChange} tree={tree} onCreated={onCreated} {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { onOpenChange, onCreated }
}

describe('CreateContextModal', () => {
  beforeEach(() => postMock.mockReset())

  it('validates that a name is required and does not call the API', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('creates a context with the entered name and default domain, then calls onCreated', async () => {
    const created = { contextId: 'ctx-9', name: 'Roadmap', domain: 'work' }
    postMock.mockResolvedValue({ context: created })
    const { onCreated } = renderModal()

    await userEvent.type(screen.getByLabelText('Name'), 'Roadmap')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/contexts', { name: 'Roadmap', domain: 'work' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
  })

  it('omits an empty description and parent from the request body', async () => {
    postMock.mockResolvedValue({ context: { contextId: 'x', name: 'A', domain: 'work' } })
    renderModal()
    await userEvent.type(screen.getByLabelText('Name'), '  Trimmed  ')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/contexts', { name: 'Trimmed', domain: 'work' }),
    )
  })
})
