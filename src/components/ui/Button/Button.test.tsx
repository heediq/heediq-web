import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('fires onClick when enabled', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disables the control and shows a spinner in the loading state', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('does not fire onClick while disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
