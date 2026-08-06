import type { Page, Route, Request } from '@playwright/test'

/**
 * REST mock for the mocked-backend tier (D-155). Intercepts every `'/api/v1/**'` call and fulfils it
 * from data a flow registers, wrapped in the real `{ ok: true, data }` envelope (`@heediq/shared`
 * `ApiSuccessSchema`). Flows build the `data` payloads from schema-`parse`d fixtures (see
 * `e2e/fixtures/`), so a mock that drifts from the contract fails at fixture-load, not silently.
 *
 * An unmatched call is fulfilled with a 404 error envelope AND recorded, so a flow can assert it hit
 * a gap instead of the test hanging on a pending request.
 */
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'
type Matcher = string | RegExp
type Responder = unknown | ((request: Request) => unknown)

interface Rule {
  method: Method
  matcher: Matcher
  status: number
  responder: Responder
  ok: boolean
}

export class ApiMock {
  private rules: Rule[] = []
  private unmatched: string[] = []

  constructor(private readonly page: Page) {}

  /** Register a success response (`{ ok: true, data }`) for a method + endpoint (path after `/api/v1`). */
  on(method: Method, matcher: Matcher, data: Responder): this {
    this.rules.unshift({ method, matcher, status: 200, responder: data, ok: true })
    return this
  }

  /** Register an error response (`{ ok: false, error }`) — for gating/permission/failure branches. */
  onError(method: Method, matcher: Matcher, status: number, error: { code: string; message: string; details?: unknown }): this {
    this.rules.unshift({ method, matcher, status, responder: error, ok: false })
    return this
  }

  /** Endpoints that were called but had no matching rule (assert this is empty for full coverage). */
  unmatchedCalls(): string[] {
    return [...this.unmatched]
  }

  async install(): Promise<void> {
    await this.page.route('**/api/v1/**', (route) => this.handle(route))
  }

  private handle(route: Route): Promise<void> {
    const request = route.request()
    const method = request.method() as Method
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, '')
    const rule = this.rules.find((r) => r.method === method && this.pathMatches(r.matcher, path))

    if (!rule) {
      this.unmatched.push(`${method} ${path}`)
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: { code: 'E2E_UNMOCKED', message: `No mock for ${method} ${path}` } }),
      })
    }

    const value = typeof rule.responder === 'function' ? (rule.responder as (r: Request) => unknown)(request) : rule.responder
    const body = rule.ok ? { ok: true, data: value } : { ok: false, error: value }
    return route.fulfill({ status: rule.status, contentType: 'application/json', body: JSON.stringify(body) })
  }

  private pathMatches(matcher: Matcher, path: string): boolean {
    // Strip a query string for string matchers; regex matchers see the full path+query.
    if (matcher instanceof RegExp) return matcher.test(path)
    return path.split('?')[0] === matcher
  }
}
