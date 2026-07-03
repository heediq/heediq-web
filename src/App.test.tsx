import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the home screen shell at the root route', () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(screen.getByText('heediq')).toBeInTheDocument()
  })
})
