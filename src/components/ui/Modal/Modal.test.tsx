import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from '../Button'

function ControlledModal() {
  const [open, setOpen] = useState(true)
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <Modal.Header>
        <Modal.Title>Assign role</Modal.Title>
        <Modal.Description>Pick a role for this user.</Modal.Description>
      </Modal.Header>
      <Modal.Body>body content</Modal.Body>
      <Modal.Footer>
        <Button onClick={() => setOpen(false)}>Confirm</Button>
      </Modal.Footer>
    </Modal>
  )
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onOpenChange={vi.fn()}>
        <Modal.Body>hidden</Modal.Body>
      </Modal>
    )
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
  })

  it('renders title, description, body and footer when open', () => {
    render(<ControlledModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Assign role')).toBeInTheDocument()
    expect(screen.getByText('Pick a role for this user.')).toBeInTheDocument()
    expect(screen.getByText('body content')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Modal open onOpenChange={onOpenChange}>
        <Modal.Body>content</Modal.Body>
      </Modal>
    )
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes via the close button', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Modal open onOpenChange={onOpenChange}>
        <Modal.Body>content</Modal.Body>
      </Modal>
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
