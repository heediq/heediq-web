const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION as string
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string

function endpoint(): string {
  return `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`
}

export class CognitoIdpError extends Error {
  /** Cognito's exception name (e.g. "NotAuthorizedException"), stripped of its namespace prefix. */
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * Calls one of Cognito's public, unauthenticated IdP API actions directly from the browser
 * (D-082) — these need only the app Client ID, not IAM credentials or SigV4 signing, unlike
 * the Admin* actions used server-side in heediq-api.
 */
async function cognitoRequest<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const type = typeof data.__type === 'string' ? data.__type : 'UnknownException'
    const code = type.includes('#') ? type.split('#')[1] : type
    throw new CognitoIdpError(code, data.message ?? code)
  }

  return data as T
}

export async function signUp(email: string, password: string): Promise<{ userConfirmed: boolean }> {
  const data = await cognitoRequest<{ UserConfirmed: boolean }>('SignUp', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  })
  return { userConfirmed: data.UserConfirmed }
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await cognitoRequest('ConfirmSignUp', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  })
}

export async function resendConfirmationCode(email: string): Promise<void> {
  await cognitoRequest('ResendConfirmationCode', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
  })
}

export interface PasswordAuthResult {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
}

export async function initiateAuthPassword(email: string, password: string): Promise<PasswordAuthResult> {
  const data = await cognitoRequest<{
    AuthenticationResult: {
      AccessToken: string
      IdToken: string
      RefreshToken: string
      ExpiresIn: number
    }
  }>('InitiateAuth', {
    ClientId: COGNITO_CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
  })

  const result = data.AuthenticationResult
  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken,
    expiresIn: result.ExpiresIn,
  }
}

/**
 * Triggers Cognito's own verification-code email. Used both for a brand-new native
 * password (first-time set) and for reactive/proactive account linking — the actual
 * ConfirmForgotPassword call is deliberately server-side (POST /auth/link/confirm, D-082)
 * so the passwordSet flag can be flipped atomically with it.
 */
export async function forgotPassword(email: string): Promise<void> {
  await cognitoRequest('ForgotPassword', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
  })
}

/**
 * Plain native-password reset for an account that already has passwordSet=true — no
 * bookkeeping flag needs to change, so this stays entirely client-direct-to-Cognito (D-082).
 * The linking case (passwordSet=false) instead goes through POST /auth/link/confirm.
 */
export async function confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
  await cognitoRequest('ConfirmForgotPassword', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  })
}
