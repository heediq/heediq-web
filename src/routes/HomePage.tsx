import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { LookupEmailResponse } from '@heediq/shared'
import { Button, Input, LoadingMark } from '../components/ui'
import { VerifyAndSetPasswordForm } from '../features/auth/VerifyAndSetPasswordForm'
import { useAuth } from '../lib/auth/AuthContext'
import { apiClient } from '../lib/api-client'
import {
  CognitoIdpError,
  confirmForgotPassword,
  forgotPassword,
  initiateAuthPassword,
} from '../lib/auth/cognito-idp'

type Step =
  | 'email'
  | 'verify'
  | 'signIn'
  | 'forgotCode'

const KNOWN_AUTH_ERROR_CODES = [
  'NotAuthorizedException',
  'UsernameExistsException',
  'CodeMismatchException',
  'ExpiredCodeException',
  'InvalidPasswordException',
  'InvalidParameterException',
  'LimitExceededException',
  'UserNotFoundException',
] as const

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, login, applyTokens } = useAuth()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'authenticated') navigate('/sources', { replace: true })
  }, [status, navigate])

  function authErrorMessage(err: unknown): string {
    if (err instanceof CognitoIdpError) {
      const known = KNOWN_AUTH_ERROR_CODES.find((code) => code === err.code)
      if (known) return t(`errors.auth.${known}`)
    }
    return t('errors.auth.generic')
  }

  async function signInWithPassword(emailToUse: string, passwordToUse: string) {
    const tokens = await initiateAuthPassword(emailToUse, passwordToUse)
    applyTokens({
      access_token: tokens.accessToken,
      id_token: tokens.idToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: tokens.expiresIn,
    })
    navigate('/sources', { replace: true })
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await apiClient.post<LookupEmailResponse>('/auth/lookup-email', { email })
      if (result.exists && result.passwordSet) {
        setStep('signIn')
      } else {
        // Brand-new email or an existing federated-only account — both go through the same
        // own-verification + set-password flow (D-089); the shared component sends the code.
        setStep('verify')
      }
    } catch {
      setError(t('errors.auth.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignInSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPasswordClick() {
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setStep('forgotCode')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotCodeSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await confirmForgotPassword(email, code, newPassword)
      await signInWithPassword(email, newPassword)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function resetToEmailStep() {
    setStep('email')
    setPassword('')
    setCode('')
    setNewPassword('')
    setError('')
  }

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingMark size="lg" aria-label={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-display">{t('home.title')}</h1>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        {step === 'email' ? (
          <form className="flex flex-col gap-4" onSubmit={(e) => void handleEmailSubmit(e)}>
            <Input
              label={t('home.emailLabel')}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error ? (
              <p role="alert" className="text-caption text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" loading={submitting}>
              {t('home.continue')}
            </Button>
            <div className="flex items-center gap-3 text-caption text-text-secondary">
              <span className="h-px flex-1 bg-border" />
              {t('home.orDivider')}
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button type="button" variant="secondary" onClick={() => void login()}>
              {t('home.continueWithSso')}
            </Button>
          </form>
        ) : null}

        {step === 'verify' ? (
          <VerifyAndSetPasswordForm
            email={email}
            onBack={resetToEmailStep}
            onSuccess={(passwordUsed) => signInWithPassword(email, passwordUsed)}
          />
        ) : null}

        {step === 'signIn' ? (
          <form className="flex flex-col gap-4" onSubmit={(e) => void handleSignInSubmit(e)}>
            <Input label={t('home.emailLabel')} type="email" value={email} disabled />
            <Input
              label={t('home.signIn.passwordLabel')}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? (
              <p role="alert" className="text-caption text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" loading={submitting}>
              {t('home.signIn.submit')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void handleForgotPasswordClick()}>
              {t('home.signIn.forgotPassword')}
            </Button>
            <Button type="button" variant="ghost" onClick={resetToEmailStep}>
              {t('home.backToEmail')}
            </Button>
          </form>
        ) : null}

        {step === 'forgotCode' ? (
          <form className="flex flex-col gap-4" onSubmit={(e) => void handleForgotCodeSubmit(e)}>
            <p className="text-body text-text-secondary">{t('home.forgot.description', { email })}</p>
            <Input
              label={t('home.forgot.codeLabel')}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Input
              label={t('home.forgot.newPasswordLabel')}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {error ? (
              <p role="alert" className="text-caption text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" loading={submitting}>
              {t('home.forgot.submit')}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
