import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its label text', () => {
    render(<Badge>done</Badge>)
    expect(screen.getByText('done')).toBeInTheDocument()
  })

  it('defaults to the neutral tone', () => {
    render(<Badge>queued</Badge>)
    expect(screen.getByText('queued')).toHaveClass('bg-surface-2')
  })

  it.each([
    ['active', 'bg-accent-bg'],
    ['success', 'bg-success-bg'],
    ['danger', 'bg-danger-bg'],
  ] as const)('applies the %s tone classes', (tone, expectedClass) => {
    render(<Badge tone={tone}>status</Badge>)
    expect(screen.getByText('status')).toHaveClass(expectedClass)
  })
})
