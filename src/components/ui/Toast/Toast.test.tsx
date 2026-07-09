import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from './Toast'

function TestButtons() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('Saved it')}>fire success</button>
      <button onClick={() => toast.error('Broke it')}>fire error</button>
    </>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a success toast when triggered', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <TestButtons />
      </ToastProvider>
    )

    await user.click(screen.getByText('fire success'))

    expect(screen.getByRole('alert')).toHaveTextContent('Saved it')
  })

  it('renders an error toast when triggered', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <TestButtons />
      </ToastProvider>
    )

    await user.click(screen.getByText('fire error'))

    expect(screen.getByRole('alert')).toHaveTextContent('Broke it')
  })

  it('dismisses via the close button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <TestButtons />
      </ToastProvider>
    )

    await user.click(screen.getByText('fire success'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Dismiss'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('auto-dismisses after the timeout', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <TestButtons />
      </ToastProvider>
    )

    await user.click(screen.getByText('fire success'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    vi.advanceTimersByTime(5000)

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('throws when useToast is called outside a provider', () => {
    function Bare() {
      useToast()
      return null
    }
    expect(() => render(<Bare />)).toThrow('useToast must be used within a ToastProvider')
  })
})
