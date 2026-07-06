import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PASSWORD_POLICY_RULES } from '@heediq/shared'
import { cn } from '../../../lib/cn'

export interface PasswordRequirementsProps {
  password: string
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const { t } = useTranslation()

  return (
    <ul
      role="status"
      aria-label={t('auth.passwordRequirements.title')}
      className="flex flex-col gap-1"
    >
      {PASSWORD_POLICY_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.id}
            className={cn('flex items-center gap-1.5 text-caption', met ? 'text-success' : 'text-text-secondary')}
          >
            {met ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <X className="size-3.5 shrink-0 text-text-disabled" aria-hidden="true" />
            )}
            <span>
              {t(`auth.passwordRequirements.rules.${rule.id}`)}
              <span className="sr-only">
                {' — '}
                {met ? t('auth.passwordRequirements.met') : t('auth.passwordRequirements.unmet')}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
