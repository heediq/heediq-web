import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ChatComposerProps {
  onSend: (text: string) => void
  onStop: () => void
  /** A turn is in flight (thinking or streaming) — send is disabled, Stop is shown. */
  streaming: boolean
  disabled?: boolean
}

const MAX_HEIGHT = 200

export function ChatComposer({ onSend, onStop, streaming, disabled }: ChatComposerProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow: reset then grow to content, capped so it scrolls internally past MAX_HEIGHT.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  const canSend = value.trim().length > 0 && !streaming && !disabled

  function send() {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter is a newline. Ignore while composing (IME).
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-md border border-border bg-surface-1 p-2">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('chat.composerPlaceholder')}
        aria-label={t('chat.composerPlaceholder')}
        className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-body text-text-primary placeholder:text-text-disabled focus-visible:outline-none"
      />
      {streaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label={t('chat.stop')}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-primary transition-colors duration-fast ease-brand hover:bg-surface-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Square className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label={t('chat.send')}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md transition-colors duration-fast ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            canSend
              ? 'bg-accent text-surface-0 hover:bg-accent-hover'
              : 'cursor-not-allowed bg-surface-2 text-text-disabled',
          )}
        >
          <ArrowUp className="size-4" />
        </button>
      )}
    </div>
  )
}
