import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isPasswordPolicyCompliant } from '@heediq/shared'
import { Button, ErrorState, Input, LoadingMark, PasswordRequirements } from '../../components/ui'
import { apiClient, ApiClientError } from '../../lib/api-client'
import { track } from '../../lib/analytics/analytics'
import { fadeUpVariants, transition } from '../../lib/motion'
import { useAsyncAction } from '../../lib/useAsyncAction'

// Shared across all three D-089 entry points (reactive login-time linking, native signup,
// proactive settings linking) — same backend calls, same two-step UI (code, then password;
// never combined into one form). Email verification is always ours, never inferred from an
// IdP's asserted email_verified (D-089/D-090).
//
// 'rateLimited' is its own phase, not folded into 'code': D-097's app-level limiter means no
// code was actually sent, so advancing to the code-entry screen would ask the user for
// something that doesn't exist yet.
//
// 'sent' is a brief confirmation beat between 'sendingCode' and 'code' (min-display-time
// pattern from 04-loading-and-feedback.md §10) so the send doesn't feel instantaneous/opaque —
// the user sees the code was actually dispatched before being asked to enter it.
type Phase = 'sendingCode' | 'sent' | 'code' | 'password' | 'rateLimited'

const SENT_CONFIRMATION_MS = 500

export interface VerifyAndSetPasswordFormProps {
  email: string
  onSuccess: (password: string) => void | Promise<void>
  onBack?: () => void
  /** True only for the native-signup caller (no account existed yet) — fires `signup_completed` in
   * addition to the `password_set` every caller gets (D-154). */
  isSignup?: boolean
}

export function VerifyAndSetPasswordForm({
  email,
  onSuccess,
  onBack,
  isSignup = false,
}: VerifyAndSetPasswordFormProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('sendingCode')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [sendAttempt, setSendAttempt] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    async function sendCode() {
      setPhase('sendingCode')
      try {
        await apiClient.post('/auth/link/request-otp', { email })
        if (!cancelled) setPhase('sent')
      } catch (err: unknown) {
        if (cancelled) return
        if (err instanceof ApiClientError && err.code === 'RATE_LIMITED') {
          setPhase('rateLimited')
        } else {
          setError(t('auth.verify.sendCodeError'))
          setPhase('code')
        }
      }
    }
    void sendCode()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, sendAttempt])

  useEffect(() => {
    if (phase !== 'sent') return
    const timer = window.setTimeout(() => setPhase('code'), SENT_CONFIRMATION_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  // The code screen must not advance until the backend has actually verified it (D-089) —
  // /auth/link/verify-otp consumes the code via Cognito's ConfirmSignUp, independent of the
  // password, which is why /auth/link/confirm (called later) no longer takes a code at all.
  const codeAction = useAsyncAction(async () => {
    setError('')
    try {
      await apiClient.post('/auth/link/verify-otp', { email, code })
      setPhase('password')
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'RATE_LIMITED') {
        setError(t('errors.auth.RATE_LIMITED'))
      } else if (err instanceof ApiClientError) {
        setError(t('auth.verify.invalidCode'))
      } else {
        setError(t('errors.auth.generic'))
      }
    }
  })

  const passwordValid = isPasswordPolicyCompliant(newPassword)

  const passwordAction = useAsyncAction(async () => {
    setError('')
    if (newPassword !== confirmPassword) {
      setError(t('auth.verify.passwordMismatch'))
      return
    }
    try {
      await apiClient.post('/auth/link/confirm', { email, newPassword })
      track('password_set', {})
      if (isSignup) track('signup_completed', {})
      await onSuccess(newPassword)
    } catch (err: unknown) {
      // WEAK_PASSWORD (Cognito's InvalidPasswordException) shouldn't normally happen — the
      // checklist below blocks submit until every rule is met — but Cognito is the final
      // authority on its own policy, so a stale/looser client-side check still gets a
      // specific message instead of the generic one.
      if (err instanceof ApiClientError && err.code === 'WEAK_PASSWORD') {
        setError(t('errors.auth.WEAK_PASSWORD'))
      } else {
        setError(t('errors.auth.generic'))
      }
    }
  })

  function handleCodeSubmit(e: FormEvent) {
    e.preventDefault()
    void codeAction.run()
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    void passwordAction.run()
  }

  let content: ReactNode

  if (phase === 'sendingCode') {
    content = (
      <div className="flex flex-col items-center gap-3 py-6">
        <LoadingMark size="sm" aria-label={t('common.loading')} />
        <p className="text-caption text-text-secondary">{t('auth.verify.sendingCode', { email })}</p>
      </div>
    )
  } else if (phase === 'sent') {
    content = (
      <div className="flex flex-col items-center gap-3 py-6">
        <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
        <p className="text-caption text-text-secondary">{t('auth.verify.codeSent', { email })}</p>
      </div>
    )
  } else if (phase === 'rateLimited') {
    content = (
      <ErrorState
        title={t('auth.verify.rateLimited.title')}
        description={t('auth.verify.rateLimited.description')}
        onRetry={() => setSendAttempt((n) => n + 1)}
      />
    )
  } else if (phase === 'code') {
    content = (
      <form className="flex flex-col gap-4" onSubmit={handleCodeSubmit}>
        <p className="text-body text-text-secondary">{t('auth.verify.codeDescription', { email })}</p>
        <Input
          label={t('auth.verify.codeLabel')}
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" loading={codeAction.pending} disabled={!code}>
          {t('auth.verify.codeSubmit')}
        </Button>
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            {t('home.backToEmail')}
          </Button>
        ) : null}
      </form>
    )
  } else {
    content = (
      <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
        <div className="flex flex-col gap-2">
          <Input
            label={t('auth.verify.newPasswordLabel')}
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordRequirements password={newPassword} />
        </div>
        <Input
          label={t('auth.verify.confirmPasswordLabel')}
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" loading={passwordAction.pending} disabled={!passwordValid}>
          {t('auth.verify.passwordSubmit')}
        </Button>
      </form>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={phase}
        variants={reduceMotion ? undefined : fadeUpVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  )
}
