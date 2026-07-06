import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordRequirements } from './PasswordRequirements'

describe('PasswordRequirements', () => {
  it('marks every rule unmet for an empty password', () => {
    render(<PasswordRequirements password="" />)
    for (const label of ['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character']) {
      expect(screen.getByText(label).closest('li')).toHaveTextContent('requirement not met')
    }
  })

  it('marks each rule met independently as the password changes', () => {
    render(<PasswordRequirements password="password1" />)
    expect(screen.getByText('At least 8 characters').closest('li')).toHaveTextContent('requirement met')
    expect(screen.getByText('One lowercase letter').closest('li')).toHaveTextContent('requirement met')
    expect(screen.getByText('One number').closest('li')).toHaveTextContent('requirement met')
    expect(screen.getByText('One uppercase letter').closest('li')).toHaveTextContent('requirement not met')
    expect(screen.getByText('One special character').closest('li')).toHaveTextContent('requirement not met')
  })

  it('marks every rule met for a fully compliant password', () => {
    render(<PasswordRequirements password="Password1!" />)
    for (const label of ['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character']) {
      expect(screen.getByText(label).closest('li')).toHaveTextContent('requirement met')
    }
  })
})
