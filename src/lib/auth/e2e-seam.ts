import type { TokenResponse } from './cognito-oauth'

/**
 * E2E-only session seam (D-155). The mocked-backend Playwright tier has no Cognito and no
 * token-endpoint round trip, so its auth fixture plants a synthetic session on `window` and the
 * app bootstraps straight into `authenticated` from it.
 *
 * This is gated on `import.meta.env.VITE_E2E` — a compile-time constant Vite statically replaces
 * (and dead-code-eliminates) at build time. In every real build (dev, staging, prod) the flag is
 * unset, so `readE2eSession` collapses to `return null` and the `window.__E2E_SESSION__` read is
 * removed entirely: no runtime path in a shipped build can ever adopt an injected session. The
 * `e2e-seam.test.ts` guard pins exactly that — with the flag off, a planted blob is still ignored.
 */
export function readE2eSession(): TokenResponse | null {
  if (!import.meta.env.VITE_E2E) return null
  const planted = (window as unknown as { __E2E_SESSION__?: TokenResponse }).__E2E_SESSION__
  return planted ?? null
}
