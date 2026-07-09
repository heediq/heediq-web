import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Select } from './Select'

const options = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
]

// Radix Select relies on DOM APIs jsdom doesn't implement.
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

describe('Select', () => {
  it('renders the label and placeholder', () => {
    render(<Select label="Role" options={options} placeholder="Choose a role" />)
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('Choose a role')).toBeInTheDocument()
  })

  it('opens and selects an option, calling onValueChange', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Select label="Role" options={options} onValueChange={onValueChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Admin' }))
    expect(onValueChange).toHaveBeenCalledWith('admin')
  })

  it('shows the error message and marks the trigger invalid', () => {
    render(<Select label="Role" options={options} error="Pick a role" />)
    expect(screen.getByText('Pick a role')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders disabled', () => {
    render(<Select label="Role" options={options} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
