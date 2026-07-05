import { describe, it, expect, vi, afterEach } from 'vitest'

vi.stubEnv('VITE_COGNITO_REGION', 'us-east-1')
vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id')

const {
  resendConfirmationCode,
  initiateAuthPassword,
  forgotPassword,
  confirmForgotPassword,
  CognitoIdpError,
} = await import('../cognito-idp')

function jsonResponse(ok: boolean, data: unknown) {
  return { ok, json: () => Promise.resolve(data) }
}

describe('cognito-idp', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('resendConfirmationCode posts to the ResendConfirmationCode action', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true, {}))
    vi.stubGlobal('fetch', fetchMock)

    await resendConfirmationCode('a@b.com')

    expect(fetchMock.mock.calls[0][1].headers['X-Amz-Target']).toBe(
      'AWSCognitoIdentityProviderService.ResendConfirmationCode',
    )
  })

  it('initiateAuthPassword returns the parsed AuthenticationResult', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(true, {
          AuthenticationResult: {
            AccessToken: 'at',
            IdToken: 'it',
            RefreshToken: 'rt',
            ExpiresIn: 3600,
          },
        }),
      ),
    )

    const result = await initiateAuthPassword('a@b.com', 'pw')
    expect(result).toEqual({ accessToken: 'at', idToken: 'it', refreshToken: 'rt', expiresIn: 3600 })
  })

  it('forgotPassword posts to the ForgotPassword action', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true, {}))
    vi.stubGlobal('fetch', fetchMock)

    await forgotPassword('a@b.com')

    expect(fetchMock.mock.calls[0][1].headers['X-Amz-Target']).toBe(
      'AWSCognitoIdentityProviderService.ForgotPassword',
    )
  })

  it('confirmForgotPassword posts the code and new password to ConfirmForgotPassword', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(true, {}))
    vi.stubGlobal('fetch', fetchMock)

    await confirmForgotPassword('a@b.com', '123456', 'NewPassword123!')

    expect(fetchMock.mock.calls[0][1].headers['X-Amz-Target']).toBe(
      'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({
      ClientId: 'test-client-id',
      Username: 'a@b.com',
      ConfirmationCode: '123456',
      Password: 'NewPassword123!',
    })
  })

  it('throws a CognitoIdpError with the exception name and message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(false, {
          __type: 'NotAuthorizedException',
          message: 'Incorrect username or password.',
        }),
      ),
    )

    await expect(initiateAuthPassword('a@b.com', 'wrong')).rejects.toMatchObject({
      code: 'NotAuthorizedException',
      message: 'Incorrect username or password.',
    })
    await expect(initiateAuthPassword('a@b.com', 'wrong')).rejects.toBeInstanceOf(CognitoIdpError)
  })

  it('strips the namespace prefix from a namespaced __type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(false, {
          __type: 'com.amazonaws.cognitoidentityprovider#UsernameExistsException',
          message: 'An account with the given email already exists.',
        }),
      ),
    )

    await expect(resendConfirmationCode('a@b.com')).rejects.toMatchObject({ code: 'UsernameExistsException' })
  })
})
