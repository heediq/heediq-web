import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Stepper } from './Stepper'

const steps = [
  { id: 'a', label: 'Placement' },
  { id: 'b', label: 'Items' },
]

describe('Stepper', () => {
  it('renders every step label', () => {
    render(<Stepper aria-label="Progress" steps={steps} current={0} />)
    expect(screen.getByText('Placement')).toBeInTheDocument()
    expect(screen.getByText('Items')).toBeInTheDocument()
  })

  it('marks the current step with aria-current', () => {
    render(<Stepper aria-label="Progress" steps={steps} current={1} />)
    const current = screen.getByText('Items').closest('[aria-current="step"]')
    expect(current).not.toBeNull()
    expect(screen.getByText('Placement').closest('[aria-current="step"]')).toBeNull()
  })

  it('shows a check (not the number) for completed steps', () => {
    render(<Stepper aria-label="Progress" steps={steps} current={1} />)
    // Step 1 (index 0) is completed → its number "1" is replaced by a check icon.
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
