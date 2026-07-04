/**
 * Decodes a JWT's payload without verifying its signature. Safe here because these tokens are
 * never trusted for authorization — they're only read client-side for display/derived values
 * (e.g. the linking flow's Cognito `identities` claim); every real authorization decision happens
 * server-side against a token Cognito itself validates.
 */
export function decodeJwtPayload<T>(token: string): T {
  const payload = token.split('.')[1]
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  return JSON.parse(json) as T
}
