import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, LoadingMark } from '../../components/ui'
import { apiClient } from '../../lib/api-client'

// Shared across all three D-089 entry points (reactive login-time linking, native signup,
// proactive settings linking) — same backend calls, same two-step UI (code, then password;
// never combined into one form). Email verification is always ours, never inferred from an
// IdP's asserted email_verified (D-089/D-090).
type Phase = 'sendingCode' | 'code' | 'password'

export interface VerifyAndSetPasswordFormProps {
  email: string
  onSuccess: (password: string) => void | Promise<void>
  onBack?: () => void
}

export function VerifyAndSetPasswordForm({ email, onSuccess, onBack }: VerifyAndSetPasswordFormProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('sendingCode')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function sendCode() {
      try {
        await apiClient.post('/auth/link/request-otp', { email })
      } catch {
        if (!cancelled) setError(t('auth.verify.sendCodeError'))
      } finally {
        if (!cancelled) setPhase('code')
      }
    }
    void sendCode()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  function handleCodeSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPhase('password')
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError(t('auth.verify.passwordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await apiClient.post('/auth/link/confirm', { email, code, newPassword })
      await onSuccess(newPassword)
    } catch {
      setError(t('errors.auth.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'sendingCode') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <LoadingMark size="sm" aria-label={t('common.loading')} />
        <p className="text-caption text-text-secondary">{t('auth.verify.sendingCode', { email })}</p>
      </div>
    )
  }

  if (phase === 'code') {
    return (
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
        <Button type="submit" variant="primary">
          {t('auth.verify.codeSubmit')}
        </Button>
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            {t('home.backToEmail')}
          </Button>
        ) : null}
      </form>
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void handlePasswordSubmit(e)}>
      <Input
        label={t('auth.verify.newPasswordLabel')}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input
        label={t('auth.verify.confirmPasswordLabel')}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" loading={submitting}>
        {t('auth.verify.passwordSubmit')}
      </Button>
    </form>
  )
}
