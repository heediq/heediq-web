import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../lib/cn'
import { Spinner } from '../Spinner'

export type IdentityProvider = 'Google' | 'Microsoft'

export interface IdentityProviderButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  provider: IdentityProvider
  loading?: boolean
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.01h3.87c2.27-2.09 3.58-5.17 3.58-8.83Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-3.01c-1.08.72-2.46 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.28A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.56.37-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4 3.11C6.2 6.88 8.86 4.77 12 4.77Z"
      />
    </svg>
  )
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  )
}

const providerMark: Record<IdentityProvider, () => React.JSX.Element> = {
  Google: GoogleMark,
  Microsoft: MicrosoftMark,
}

const providerLabelKey: Record<IdentityProvider, string> = {
  Google: 'home.continueWithGoogle',
  Microsoft: 'home.continueWithMicrosoft',
}

export const IdentityProviderButton = forwardRef<HTMLButtonElement, IdentityProviderButtonProps>(
  ({ provider, loading = false, className, disabled, ...props }, ref) => {
    const { t } = useTranslation()
    const Mark = providerMark[provider]

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border ' +
            'bg-surface-1 font-sans text-body font-medium text-text-primary transition-colors ' +
            'hover:bg-surface-2 active:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 ' +
            'focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 ' +
            'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : <Mark />}
        {t(providerLabelKey[provider])}
      </button>
    )
  }
)
IdentityProviderButton.displayName = 'IdentityProviderButton'
