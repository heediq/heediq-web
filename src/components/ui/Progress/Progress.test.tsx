import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Progress } from './Progress'

describe('Progress', () => {
  it('exposes the value via progressbar ARIA', () => {
    render(<Progress value={42} aria-label="Upload progress" />)
    const bar = screen.getByRole('progressbar', { name: 'Upload progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '42')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps and rounds out-of-range values', () => {
    const { rerender } = render(<Progress value={-10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    rerender(<Progress value={166.7} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    rerender(<Progress value={33.4} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
  })

  it('falls back to a default accessible name', () => {
    render(<Progress value={0} />)
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toBeInTheDocument()
  })
})
