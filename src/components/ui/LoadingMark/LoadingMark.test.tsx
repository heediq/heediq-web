import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingMark } from './LoadingMark'

describe('LoadingMark', () => {
  it('renders with the default "Loading" label', () => {
    render(<LoadingMark />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('accepts a custom aria-label', () => {
    render(<LoadingMark aria-label="Loading sources" />)
    expect(screen.getByRole('status', { name: 'Loading sources' })).toBeInTheDocument()
  })

  it('renders flat fill by default (no gradient defs)', () => {
    const { container } = render(<LoadingMark />)
    expect(container.querySelector('linearGradient')).not.toBeInTheDocument()
    expect(container.querySelector('rect')).toHaveAttribute('fill', '#F0A93B')
  })

  it('renders a gradient fill when tone="gradient"', () => {
    const { container } = render(<LoadingMark tone="gradient" />)
    const gradient = container.querySelector('linearGradient')
    expect(gradient).toBeInTheDocument()
    const rect = container.querySelector('rect')
    expect(rect?.getAttribute('fill')).toMatch(/^url\(#/)
  })

  it('renders at the sm pixel size', () => {
    render(<LoadingMark size="sm" aria-label="small loader" />)
    const svg = screen.getByRole('status', { name: 'small loader' })
    expect(svg).toHaveAttribute('width', '28')
    expect(svg).toHaveAttribute('height', '28')
  })
})
