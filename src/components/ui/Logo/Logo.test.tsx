import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders the brand mark with an accessible name', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Heediq' })).toBeInTheDocument()
  })

  it('applies the requested size variant', () => {
    render(<Logo size="lg" />)
    expect(screen.getByRole('img', { name: 'Heediq' })).toHaveClass('h-10')
  })
})
