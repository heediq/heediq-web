import { describe, it, expect } from 'vitest'
import { decodeJwtPayload } from '../jwt'

function makeToken(payload: unknown): string {
  const utf8Bytes = encodeURIComponent(JSON.stringify(payload)).replace(
    /%([0-9A-F]{2})/g,
    (_, hex: string) => String.fromCharCode(parseInt(hex, 16)),
  )
  const base64 = btoa(utf8Bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${base64}.signature`
}

describe('decodeJwtPayload', () => {
  it('decodes a base64url-encoded JSON payload', () => {
    const token = makeToken({ sub: 'user-123', email: 'a@b.com' })
    expect(decodeJwtPayload<{ sub: string; email: string }>(token)).toEqual({
      sub: 'user-123',
      email: 'a@b.com',
    })
  })

  it('decodes non-ASCII characters correctly', () => {
    const token = makeToken({ name: 'Andrii Перевозний' })
    expect(decodeJwtPayload<{ name: string }>(token)).toEqual({ name: 'Andrii Перевозний' })
  })
})
