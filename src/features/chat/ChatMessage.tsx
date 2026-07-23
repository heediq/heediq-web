import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import { cn } from '../../lib/cn'
import { fadeUpVariants, transition } from '../../lib/motion'
import { Markdown } from './Markdown'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  /** Show a per-turn copy control (assistant turns; off for the live-streaming partial). */
  copyable?: boolean
  /** Extra controls under the bubble (Retry/Regenerate). */
  actions?: ReactNode
}

export function ChatMessage({ role, content, copyable = false, actions }: ChatMessageProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'

  async function copy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const bubble = (
    <div className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-full rounded-md px-4 py-3',
          isUser
            ? 'bg-accent-bg text-text-primary'
            : 'border border-border bg-surface-1 text-text-primary',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-body">{content}</p>
        ) : (
          <Markdown content={content} />
        )}
      </div>
      {(copyable || actions) && !isUser ? (
        <div className="flex items-center gap-2">
          {copyable ? (
            <button
              type="button"
              onClick={() => void copy()}
              className="flex items-center gap-1 rounded-sm px-1.5 py-1 text-caption text-text-secondary transition-colors duration-fast ease-brand hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? t('chat.copied') : t('chat.copy')}
            </button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  )

  if (reduceMotion) return bubble
  return (
    <motion.div variants={fadeUpVariants} initial="initial" animate="animate" transition={transition}>
      {bubble}
    </motion.div>
  )
}
