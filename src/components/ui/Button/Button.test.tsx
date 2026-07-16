import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Link } from 'react-router-dom'
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

  it('animates its focus ring, color, and disabled-state transitions via token-driven classes', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button')
    // Regression: box-shadow (the focus ring) and opacity (the disabled state) must be in the
    // transitioned property list, or they snap instantly instead of animating in/out.
    expect(button.className).toMatch(/transition-\[background-color,color,border-color,box-shadow,opacity\]/)
    expect(button.className).toContain('duration-base')
  })

  it('renders as its child element via asChild without crashing on Slot child count', () => {
    render(
      <Button asChild variant="ghost">
        <Link to="/sources">View sources</Link>
      </Button>,
      { wrapper: MemoryRouter },
    )
    expect(screen.getByRole('link', { name: 'View sources' })).toHaveAttribute('href', '/sources')
  })
})
