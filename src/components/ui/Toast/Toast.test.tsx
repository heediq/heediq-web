import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { ToastProvider, useToast } from './Toast'

// The dismiss/auto-dismiss behavior under test is orthogonal to the exit animation, and Framer
// Motion's rAF-driven transition doesn't resolve deterministically under fake timers. Stub it to a
// plain passthrough so these tests assert on toast state, not on animation timing.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => {
          const cleanProps = { ...props }
          delete cleanProps.variants
          delete cleanProps.initial
          delete cleanProps.animate
          delete cleanProps.exit
          delete cleanProps.transition
          delete cleanProps.layout
          return <div {...cleanProps}>{children}</div>
        },
    }
  ),
  useReducedMotion: () => false,
}))

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
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
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
