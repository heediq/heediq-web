import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('calls onChange as the user types', async () => {
    const onChange = vi.fn()
    render(<Input label="Email" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Email'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows an error message and marks the field invalid', () => {
    render(<Input label="Email" error="Invalid email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const message = screen.getByRole('alert')
    expect(message).toHaveTextContent('Invalid email')
    expect(input).toHaveAttribute('aria-describedby', message.id)
  })

  it('shows hint text when there is no error', () => {
    render(<Input label="Email" hint="We'll never share this" />)
    expect(screen.getByText("We'll never share this")).toBeInTheDocument()
  })

  it('prefers the error over the hint when both are given', () => {
    render(<Input label="Email" hint="hint text" error="error text" />)
    expect(screen.getByRole('alert')).toHaveTextContent('error text')
    expect(screen.queryByText('hint text')).not.toBeInTheDocument()
  })

  it('disables the input when disabled is set', () => {
    render(<Input label="Email" disabled />)
    expect(screen.getByLabelText('Email')).toBeDisabled()
  })
})
