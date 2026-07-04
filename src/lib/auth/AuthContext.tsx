import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setAccessTokenGetter } from '../api-client'
import { logoutUrl, refreshTokens, startLogin, type TokenResponse } from './cognito-oauth'
import { clearSession, getAccessToken, getRefreshToken, setRefreshToken, setSession } from './token-store'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  login: () => Promise<void>
  logout: () => void
  applyTokens: (tokens: TokenResponse) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    setAccessTokenGetter(getAccessToken)
  }, [])

  useEffect(() => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      setStatus('anonymous')
      return
    }

    refreshTokens(refreshToken)
      .then((tokens) => {
        setSession(tokens)
        setStatus('authenticated')
      })
      .catch(() => {
        clearSession()
        setStatus('anonymous')
      })
  }, [])

  const applyTokens = useCallback((tokens: TokenResponse) => {
    setSession(tokens)
    setRefreshToken(tokens.refresh_token)
    setStatus('authenticated')
  }, [])

  const login = useCallback(() => startLogin(), [])

  const logout = useCallback(() => {
    clearSession()
    setStatus('anonymous')
    window.location.assign(logoutUrl())
  }, [])

  const value = useMemo(
    () => ({ status, login, logout, applyTokens }),
    [status, login, logout, applyTokens],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
