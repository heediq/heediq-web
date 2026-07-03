import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('renders with the default "Loading" label', () => {
    render(<Spinner />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('accepts a custom aria-label', () => {
    render(<Spinner aria-label="Refreshing sources" />)
    expect(screen.getByRole('status', { name: 'Refreshing sources' })).toBeInTheDocument()
  })
})
