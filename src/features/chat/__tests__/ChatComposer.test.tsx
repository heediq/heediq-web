import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ChatComposer } from '../ChatComposer'

describe('ChatComposer', () => {
  it('sends on Enter and clears the input', async () => {
    const onSend = vi.fn()
    render(<ChatComposer onSend={onSend} onStop={vi.fn()} streaming={false} />)
    const box = screen.getByRole('textbox')
    await userEvent.type(box, 'hello world')
    await userEvent.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledWith('hello world')
    expect(box).toHaveValue('')
  })

  it('inserts a newline on Shift+Enter without sending', async () => {
    const onSend = vi.fn()
    render(<ChatComposer onSend={onSend} onStop={vi.fn()} streaming={false} />)
    const box = screen.getByRole('textbox')
    await userEvent.type(box, 'line one')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    await userEvent.type(box, 'line two')
    expect(onSend).not.toHaveBeenCalled()
    expect((box as HTMLTextAreaElement).value).toBe('line one\nline two')
  })

  it('does not send empty/whitespace-only input', async () => {
    const onSend = vi.fn()
    render(<ChatComposer onSend={onSend} onStop={vi.fn()} streaming={false} />)
    await userEvent.type(screen.getByRole('textbox'), '   ')
    await userEvent.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('shows a Stop control while streaming and calls onStop', async () => {
    const onStop = vi.fn()
    render(<ChatComposer onSend={vi.fn()} onStop={onStop} streaming />)
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onStop).toHaveBeenCalledOnce()
  })

  it('does not send while a turn is in flight (Enter is a no-op)', async () => {
    const onSend = vi.fn()
    render(<ChatComposer onSend={onSend} onStop={vi.fn()} streaming />)
    await userEvent.type(screen.getByRole('textbox'), 'queued?')
    await userEvent.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })
})
