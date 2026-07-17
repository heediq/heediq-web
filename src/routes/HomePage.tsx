import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { LookupEmailResponse } from '@heediq/shared'
import { Button, FullPageLoading, IdentityProviderButton, Input, Logo } from '../components/ui'
import type { IdentityProvider } from '../components/ui'
import { VerifyAndSetPasswordForm } from '../features/auth/VerifyAndSetPasswordForm'
import { useAuth } from '../lib/auth/AuthContext'
import { apiClient } from '../lib/api-client'
import { fadeXVariants, transition } from '../lib/motion'
import { useAsyncAction } from '../lib/useAsyncAction'
import { usePerceivedLoading } from '../lib/usePerceivedLoading'
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
  const [error, setError] = useState('')
  const [ssoProvider, setSsoProvider] = useState<IdentityProvider | null>(null)
  const reduceMotion = useReducedMotion()
  // See ProtectedRoute — same D-122 debounce so a fast initial session check never flashes this.
  // `status === 'authenticated'` is handled separately below (instant, no debounce): it's a
  // redirect-in-progress guard, not a genuine wait, and must never let the form flash underneath
  // it while the navigate effect above is still pending.
  const showSessionLoading = usePerceivedLoading(status === 'loading', { delay: 150, minDuration: 600 })

  useEffect(() => {
    if (status === 'authenticated') navigate('/sources', { replace: true })
  }, [status, navigate])

  useEffect(() => {
    // Cancelling on the IdP's account picker returns here via the browser's back-forward
    // cache rather than a fresh page load, which would otherwise restore ssoProvider's
    // stale loading/disabled state with no way to retry.
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setSsoProvider(null)
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

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

  const emailAction = useAsyncAction(async () => {
    setError('')
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
    }
  })

  const signInAction = useAsyncAction(async () => {
    setError('')
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setError(authErrorMessage(err))
    }
  })

  const forgotPasswordAction = useAsyncAction(async () => {
    setError('')
    try {
      await forgotPassword(email)
      setStep('forgotCode')
    } catch (err) {
      setError(authErrorMessage(err))
    }
  })

  const forgotCodeAction = useAsyncAction(async () => {
    setError('')
    try {
      await confirmForgotPassword(email, code, newPassword)
      await signInWithPassword(email, newPassword)
    } catch (err) {
      setError(authErrorMessage(err))
    }
  })

  function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    void emailAction.run()
  }

  function handleSignInSubmit(e: FormEvent) {
    e.preventDefault()
    void signInAction.run()
  }

  function handleForgotCodeSubmit(e: FormEvent) {
    e.preventDefault()
    void forgotCodeAction.run()
  }

  function handleSsoClick(provider: IdentityProvider) {
    setSsoProvider(provider)
    void login(provider)
  }

  function resetToEmailStep() {
    setStep('email')
    setPassword('')
    setCode('')
    setNewPassword('')
    setError('')
  }

  if (status === 'authenticated' || showSessionLoading) {
    return <FullPageLoading aria-label={t('common.loading')} />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start gap-6 p-4 pt-[20vh]">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <Logo size="lg" />
          <h1 className="text-display">{t('home.title')}</h1>
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4 overflow-hidden px-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            variants={reduceMotion ? undefined : fadeXVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
          >
            {step === 'email' ? (
              <form className="flex flex-col gap-4" onSubmit={handleEmailSubmit}>
                <IdentityProviderButton
                  provider="Google"
                  loading={ssoProvider === 'Google'}
                  disabled={ssoProvider !== null && ssoProvider !== 'Google'}
                  onClick={() => handleSsoClick('Google')}
                />
                <IdentityProviderButton
                  provider="Microsoft"
                  loading={ssoProvider === 'Microsoft'}
                  disabled={ssoProvider !== null && ssoProvider !== 'Microsoft'}
                  onClick={() => handleSsoClick('Microsoft')}
                />
                <div className="flex items-center gap-3 text-caption text-text-secondary">
                  <span className="h-px flex-1 bg-border" />
                  {t('home.orDivider')}
                  <span className="h-px flex-1 bg-border" />
                </div>
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
                <Button type="submit" variant="primary" loading={emailAction.pending}>
                  {t('home.continue')}
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
              <form className="flex flex-col gap-4" onSubmit={handleSignInSubmit}>
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
                <Button type="submit" variant="primary" loading={signInAction.pending}>
                  {t('home.signIn.submit')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  loading={forgotPasswordAction.pending}
                  onClick={() => void forgotPasswordAction.run()}
                >
                  {t('home.signIn.forgotPassword')}
                </Button>
                <Button type="button" variant="ghost" onClick={resetToEmailStep}>
                  {t('home.backToEmail')}
                </Button>
              </form>
            ) : null}

            {step === 'forgotCode' ? (
              <form className="flex flex-col gap-4" onSubmit={handleForgotCodeSubmit}>
                <p className="text-body text-text-secondary">
                  {t('home.forgot.description', { email })}
                </p>
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
                <Button type="submit" variant="primary" loading={forgotCodeAction.pending}>
                  {t('home.forgot.submit')}
                </Button>
              </form>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
