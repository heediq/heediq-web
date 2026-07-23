import { useTranslation } from 'react-i18next'

/**
 * The pre-first-token "thinking" indicator (04-loading-and-feedback §6) — shown the instant a
 * message is sent, before the first `chat_delta`, so the send→first-token gap is never a silent wait.
 * Three dots pulse (motion-safe; static under prefers-reduced-motion).
 */
export function ThinkingIndicator() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-label={t('chat.thinking')} className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-text-secondary motion-safe:animate-pulse"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  )
}
