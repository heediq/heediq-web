import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ListenButton } from './ListenButton'

describe('ListenButton', () => {
  it('renders the idle state and starts on click', async () => {
    const onClick = vi.fn()
    render(<ListenButton state="idle" label="Start recording" aria-label="Start recording" onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Start recording' })
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders the recording state with its live label and stops on click', async () => {
    const onClick = vi.fn()
    render(
      <ListenButton
        state="recording"
        label="Recording… 00:12"
        aria-label="Recording, 00:12 elapsed. Activate to stop."
        onClick={onClick}
      />,
    )
    const button = screen.getByRole('button', {
      name: 'Recording, 00:12 elapsed. Activate to stop.',
    })
    expect(button).toHaveTextContent('Recording… 00:12')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders the processing state disabled and busy, ignoring clicks', async () => {
    const onClick = vi.fn()
    render(
      <ListenButton
        state="processing"
        label="Uploading…"
        aria-label="Processing your recording"
        onClick={onClick}
      />,
    )
    const button = screen.getByRole('button', { name: 'Processing your recording' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
