import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('renders the title and an alert role for assistive tech', () => {
    render(<ErrorState title="Could not sign you in" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not sign you in')
  })

  it('renders an optional description', () => {
    render(<ErrorState title="Failed" description="Try again in a moment." />)
    expect(screen.getByText('Try again in a moment.')).toBeInTheDocument()
  })

  it('omits the retry button when no onRetry is given', () => {
    render(<ErrorState title="Failed" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('invokes onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorState title="Failed" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('accepts a custom retry label', () => {
    render(<ErrorState title="Failed" onRetry={() => {}} retryLabel="Try again" />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
