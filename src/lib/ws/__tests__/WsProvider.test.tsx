import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WsProvider } from '../WsProvider'
import { useWsEvent } from '../useWsEvent'

let authStatus: 'loading' | 'authenticated' | 'anonymous' = 'authenticated'
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ status: authStatus }),
}))

vi.mock('../../auth/token-store', () => ({
  getIdToken: () => 'test-id-token',
}))

vi.mock('../../api-client', () => ({
  wsUrl: () => 'wss://ws-test.heediq.com',
}))

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  close() {
    this.closed = true
    this.onclose?.()
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) })
  }
}

function JobStatusProbe({ onEvent }: { onEvent: (payload: unknown) => void }) {
  useWsEvent('job_status', onEvent)
  return null
}

describe('WsProvider', () => {
  beforeEach(() => {
    authStatus = 'authenticated'
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does not open a socket when the user is not authenticated', () => {
    authStatus = 'anonymous'
    render(
      <WsProvider>
        <span />
      </WsProvider>,
    )
    expect(FakeWebSocket.instances).toHaveLength(0)
  })

  it('opens a socket with the ID token in the URL once authenticated', () => {
    render(
      <WsProvider>
        <span />
      </WsProvider>,
    )
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toBe('wss://ws-test.heediq.com?token=test-id-token')
  })

  it('dispatches a parsed job_status event to a subscribed handler', () => {
    const onEvent = vi.fn()
    render(
      <WsProvider>
        <JobStatusProbe onEvent={onEvent} />
      </WsProvider>,
    )

    const payload = { jobId: '00000000-0000-0000-0000-000000000001', sourceId: '00000000-0000-0000-0000-000000000002', status: 'transcribing' }
    FakeWebSocket.instances[0].emitMessage({
      scope: { kind: 'org', orgId: '00000000-0000-0000-0000-000000000003' },
      type: 'job_status',
      occurredAt: new Date().toISOString(),
      payload,
    })

    expect(onEvent).toHaveBeenCalledWith(payload)
  })

  it('drops a malformed message without throwing or notifying handlers', () => {
    const onEvent = vi.fn()
    render(
      <WsProvider>
        <JobStatusProbe onEvent={onEvent} />
      </WsProvider>,
    )

    expect(() => FakeWebSocket.instances[0].emitMessage('not json')).not.toThrow()
    expect(() => FakeWebSocket.instances[0].emitMessage({ type: 'job_status' })).not.toThrow()
    expect(onEvent).not.toHaveBeenCalled()
  })

  it('reconnects with backoff after the socket closes', async () => {
    render(
      <WsProvider>
        <span />
      </WsProvider>,
    )
    expect(FakeWebSocket.instances).toHaveLength(1)

    FakeWebSocket.instances[0].close()
    expect(FakeWebSocket.instances).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('closes the socket on unmount and does not reconnect', async () => {
    const { unmount } = render(
      <WsProvider>
        <span />
      </WsProvider>,
    )
    const socket = FakeWebSocket.instances[0]
    unmount()

    expect(socket.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(5000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('stops notifying a handler once its subscribing component unmounts', () => {
    const onEvent = vi.fn()
    const { rerender } = render(
      <WsProvider>
        <JobStatusProbe onEvent={onEvent} />
      </WsProvider>,
    )

    rerender(
      <WsProvider>
        <span />
      </WsProvider>,
    )

    FakeWebSocket.instances[0].emitMessage({
      scope: { kind: 'org', orgId: '00000000-0000-0000-0000-000000000003' },
      type: 'job_status',
      occurredAt: new Date().toISOString(),
      payload: {
        jobId: '00000000-0000-0000-0000-000000000001',
        sourceId: '00000000-0000-0000-0000-000000000002',
        status: 'transcribing',
      },
    })

    expect(onEvent).not.toHaveBeenCalled()
  })
})
