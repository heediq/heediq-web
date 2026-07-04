import { describe, it, expect } from 'vitest'
import { generateCodeChallenge, generateCodeVerifier, generateState } from '../pkce'

describe('pkce', () => {
  it('generates a url-safe code verifier with no padding', () => {
    const verifier = generateCodeVerifier()
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/)
    expect(verifier.length).toBeGreaterThan(32)
  })

  it('generates distinct verifiers and state on each call', () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier())
    expect(generateState()).not.toBe(generateState())
  })

  it('derives a deterministic S256 challenge from a given verifier', async () => {
    const challenge = await generateCodeChallenge('test-verifier')
    expect(challenge).toBe(await generateCodeChallenge('test-verifier'))
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/)
  })

  it('derives different challenges for different verifiers', async () => {
    const a = await generateCodeChallenge('verifier-a')
    const b = await generateCodeChallenge('verifier-b')
    expect(a).not.toBe(b)
  })
})
