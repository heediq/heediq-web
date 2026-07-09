import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox label="Accept" />)
    expect(screen.getByRole('checkbox', { name: 'Accept' })).toHaveAttribute('data-state', 'unchecked')
  })

  it('toggles on click and calls onCheckedChange', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Accept" onCheckedChange={onCheckedChange} />)

    await user.click(screen.getByRole('checkbox', { name: 'Accept' }))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('is keyboard-operable via Space', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Accept" onCheckedChange={onCheckedChange} />)

    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Accept' })).toHaveFocus()
    await user.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('renders checked state when controlled', () => {
    render(<Checkbox label="Accept" checked />)
    expect(screen.getByRole('checkbox', { name: 'Accept' })).toHaveAttribute('data-state', 'checked')
  })

  it('renders disabled and does not toggle on click', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Accept" disabled onCheckedChange={onCheckedChange} />)

    const checkbox = screen.getByRole('checkbox', { name: 'Accept' })
    expect(checkbox).toBeDisabled()
    await user.click(checkbox)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
