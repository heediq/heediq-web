import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.stubEnv('VITE_COGNITO_DOMAIN', 'https://heediq-test.auth.us-east-1.amazoncognito.com')
vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id')

const { startLogin, startProviderLink, exchangeCodeForTokens, logoutUrl, OAuthCallbackError } =
  await import('../cognito-oauth')

describe('cognito-oauth', () => {
  beforeEach(() => {
    sessionStorage.clear()
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('startLogin', () => {
    it('redirects to the Cognito Hosted UI authorize endpoint with PKCE params', async () => {
      await startLogin()

      expect(window.location.assign).toHaveBeenCalledTimes(1)
      const url = new URL((window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0])

      expect(url.origin + url.pathname).toBe(
        'https://heediq-test.auth.us-east-1.amazoncognito.com/oauth2/authorize',
      )
      expect(url.searchParams.get('client_id')).toBe('test-client-id')
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      expect(url.searchParams.get('code_challenge')).toBeTruthy()
      expect(url.searchParams.get('state')).toBeTruthy()
      expect(url.searchParams.get('redirect_uri')).toBe(`${window.location.origin}/auth/callback`)
    })

    it('persists the verifier and state for the later callback exchange', async () => {
      await startLogin()
      expect(sessionStorage.getItem('heediq.pkce.verifier')).toBeTruthy()
      expect(sessionStorage.getItem('heediq.pkce.state')).toBeTruthy()
    })

    it('omits identity_provider and prompt when no provider is given, landing on Cognito\'s own IdP picker', async () => {
      await startLogin()
      const url = new URL((window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url.searchParams.has('identity_provider')).toBe(false)
      expect(url.searchParams.has('prompt')).toBe(false)
    })

    it('adds identity_provider=Google to go straight to Google, skipping the picker (D-118)', async () => {
      await startLogin('Google')
      const url = new URL((window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url.searchParams.get('identity_provider')).toBe('Google')
    })

    it('adds identity_provider=Microsoft to go straight to Microsoft, skipping the picker (D-118)', async () => {
      await startLogin('Microsoft')
      const url = new URL((window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url.searchParams.get('identity_provider')).toBe('Microsoft')
    })

    it('adds prompt=select_account when a provider is given, forcing the IdP account chooser', async () => {
      await startLogin('Google')
      const url = new URL((window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url.searchParams.get('prompt')).toBe('select_account')
    })
  })

  describe('startProviderLink', () => {
    it('always adds prompt=select_account, letting the user pick which account to link', async () => {
      await startProviderLink('Google')
      const url = new URL((window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(url.searchParams.get('identity_provider')).toBe('Google')
      expect(url.searchParams.get('prompt')).toBe('select_account')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('rejects when the Hosted UI reports an error', async () => {
      const params = new URLSearchParams({ error: 'access_denied', error_description: 'user cancelled' })
      await expect(exchangeCodeForTokens(params)).rejects.toThrow(OAuthCallbackError)
    })

    it('rejects when no code is present', async () => {
      await expect(exchangeCodeForTokens(new URLSearchParams())).rejects.toThrow('missing_code')
    })

    it('rejects when there is no stored verifier (e.g. reloaded/replayed callback)', async () => {
      const params = new URLSearchParams({ code: 'abc', state: 'xyz' })
      await expect(exchangeCodeForTokens(params)).rejects.toThrow('missing_verifier')
    })

    it('rejects on state mismatch', async () => {
      await startLogin()
      const storedState = sessionStorage.getItem('heediq.pkce.state')
      sessionStorage.setItem('heediq.pkce.verifier', 'some-verifier')
      sessionStorage.setItem('heediq.pkce.state', storedState as string)

      const params = new URLSearchParams({ code: 'abc', state: 'not-the-real-state' })
      await expect(exchangeCodeForTokens(params)).rejects.toThrow('state_mismatch')
    })

    it('consumes the stored verifier/state even on failure so a callback cannot be replayed', async () => {
      await startLogin()
      const params = new URLSearchParams({ code: 'abc', state: 'wrong' })
      await expect(exchangeCodeForTokens(params)).rejects.toThrow(OAuthCallbackError)

      expect(sessionStorage.getItem('heediq.pkce.verifier')).toBeNull()
      expect(sessionStorage.getItem('heediq.pkce.state')).toBeNull()
    })

    it('exchanges a valid code for tokens via the token endpoint', async () => {
      await startLogin()
      const state = sessionStorage.getItem('heediq.pkce.state') as string

      const tokens = {
        access_token: 'at',
        id_token: 'it',
        refresh_token: 'rt',
        token_type: 'Bearer',
        expires_in: 3600,
      }
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(tokens) })
      vi.stubGlobal('fetch', fetchMock)

      const result = await exchangeCodeForTokens(new URLSearchParams({ code: 'abc', state }))

      expect(result).toEqual(tokens)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://heediq-test.auth.us-east-1.amazoncognito.com/oauth2/token',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('rejects when the token endpoint responds with an error status', async () => {
      await startLogin()
      const state = sessionStorage.getItem('heediq.pkce.state') as string
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

      await expect(
        exchangeCodeForTokens(new URLSearchParams({ code: 'abc', state })),
      ).rejects.toThrow('token_exchange_failed')
    })
  })

  describe('logoutUrl', () => {
    it('builds the Hosted UI logout URL pointing back at the app origin', () => {
      const url = new URL(logoutUrl())
      expect(url.origin + url.pathname).toBe(
        'https://heediq-test.auth.us-east-1.amazoncognito.com/logout',
      )
      expect(url.searchParams.get('logout_uri')).toBe(window.location.origin)
      expect(url.searchParams.get('client_id')).toBe('test-client-id')
    })
  })
})
