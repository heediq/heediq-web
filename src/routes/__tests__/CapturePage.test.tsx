import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ToastProvider } from '../../components/ui'
import { CapturePage } from '../CapturePage'

const postMock = vi.fn()
vi.mock('../../lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api-client')>()
  return { ...actual, apiClient: { post: (...args: unknown[]) => postMock(...args) } }
})

/**
 * A stub `XMLHttpRequest` for the presigned S3 PUT — jsdom has no real XHR upload. `send()` fires two
 * `upload.onprogress` ticks then completes with `xhrStatus` (async so React can flush the progress
 * state). Set `xhrStatus` per-test before triggering the upload; default is a successful 200.
 */
let xhrStatus = 200
class FakeXHR {
  status = 0
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  open() {}
  setRequestHeader() {}
  send() {
    setTimeout(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 })
      this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 })
      this.status = xhrStatus
      this.onload?.()
    }, 0)
  }
}
vi.stubGlobal('XMLHttpRequest', FakeXHR as unknown as typeof XMLHttpRequest)

/**
 * A stub `MediaRecorder` + `getUserMedia` for the live-record path — jsdom has neither. `stop()` emits a
 * single `audio/webm` chunk then fires `onstop`, so the recorder resolves a non-empty Blob. Set
 * `getUserMediaOk = false` before a test to simulate a denied-permission start.
 */
let getUserMediaOk = true
class FakeMediaRecorder {
  static isTypeSupported = () => true
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(
    public stream: MediaStream,
    public options?: { mimeType?: string },
  ) {}
  start() {}
  stop() {
    this.ondataavailable?.({ data: new Blob([new Uint8Array(16)], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}
vi.stubGlobal('MediaRecorder', FakeMediaRecorder as unknown as typeof MediaRecorder)
Object.defineProperty(navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: () =>
      getUserMediaOk
        ? Promise.resolve({ getTracks: () => [{ stop: () => {} }] } as unknown as MediaStream)
        : Promise.reject(new Error('NotAllowedError')),
  },
})

/** A File whose `text()` resolves to `content` — jsdom's Blob doesn't implement text(). */
function textFile(name: string, content: string): File {
  const file = new File([content], name, { type: 'text/plain' })
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(content) })
  return file
}

/** An audio File of a given (possibly faked) byte size. */
function audioFile(name: string, type: string, size = 1024): File {
  const file = new File([new Uint8Array(1)], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/capture']}>
          <Routes>
            <Route path="/capture" element={<CapturePage />} />
            <Route path="/sources/:sourceId" element={<div>detail page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  const inputs = [...utils.container.querySelectorAll('input[type="file"]')] as HTMLInputElement[]
  const audioInput = inputs.find((i) => i.accept.includes('audio')) as HTMLInputElement
  const textInput = inputs.find((i) => i.accept.includes('.txt')) as HTMLInputElement
  return { ...utils, audioInput, textInput }
}

describe('CapturePage', () => {
  // Deliberately no `beforeEach` mock reset/clear/implementation: on vitest v2, touching a vi.fn's
  // state between tests makes its spy result-tracking flag the *already-awaited-and-caught*
  // rejection in the failure cases below as an unhandled rejection, failing the suite spuriously.
  // The tests that call the API set their own implementation, and the others never hit it, so
  // cross-test isolation isn't needed here.

  describe('text-file path', () => {
    it('shows the text-file prompt before a file is chosen', () => {
      renderPage()
      expect(screen.getByRole('button', { name: 'Choose a text file' })).toBeInTheDocument()
    })

    it('prefills the title from the filename and previews the content once a file is chosen', async () => {
      const { textInput } = renderPage()
      await userEvent.upload(textInput, textFile('sprint-notes.txt', 'hello world'))
      expect(await screen.findByDisplayValue('sprint-notes')).toBeInTheDocument()
      expect(screen.getByText('hello world')).toBeInTheDocument()
    })

    it('creates a source, ingests the text, and routes to the source detail on submit', async () => {
      postMock.mockImplementation((path: string) =>
        path === '/sources'
          ? Promise.resolve({ source: { sourceId: 'src-new' } })
          : Promise.resolve({ jobId: 'job-1' }),
      )
      const { textInput } = renderPage()
      await userEvent.upload(textInput, textFile('notes.md', 'the meeting content'))
      await screen.findByDisplayValue('notes')
      await userEvent.click(screen.getByRole('button', { name: 'Add to library' }))

      await waitFor(() => expect(screen.getByText('detail page')).toBeInTheDocument())
      expect(postMock).toHaveBeenCalledWith('/sources', { title: 'notes' })
      expect(postMock).toHaveBeenCalledWith('/sources/src-new/text', { text: 'the meeting content' })
    })

    it('surfaces an error and stays put when ingest fails', async () => {
      postMock.mockRejectedValue(new Error('boom'))
      const { textInput } = renderPage()
      await userEvent.upload(textInput, textFile('notes.txt', 'content'))
      await screen.findByDisplayValue('notes')
      await userEvent.click(screen.getByRole('button', { name: 'Add to library' }))

      expect(
        await screen.findByText('Something went wrong adding your file. Please try again.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('detail page')).not.toBeInTheDocument()
    })

    it('rejects an empty file with a message instead of advancing', async () => {
      const { textInput } = renderPage()
      await userEvent.upload(textInput, textFile('empty.txt', '   '))
      expect(
        await screen.findByText('That file is empty — pick one with some text in it.'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add to library' })).not.toBeInTheDocument()
    })
  })

  describe('audio-file path', () => {
    it('shows the audio prompt before a file is chosen', () => {
      renderPage()
      expect(screen.getByRole('button', { name: 'Choose an audio file' })).toBeInTheDocument()
    })

    it('prefills the title from the filename once an audio file is chosen', async () => {
      const { audioInput } = renderPage()
      await userEvent.upload(audioInput, audioFile('standup.mp3', 'audio/mpeg'))
      expect(await screen.findByDisplayValue('standup')).toBeInTheDocument()
    })

    it('creates a source, presigns, uploads, enqueues transcription, and routes to detail', async () => {
      xhrStatus = 200
      postMock.mockImplementation((path: string) => {
        if (path === '/sources') return Promise.resolve({ source: { sourceId: 'src-aud' } })
        if (path === '/upload/presign')
          return Promise.resolve({ uploadUrl: 'https://s3/put', s3Key: 'k', expiresIn: 900 })
        return Promise.resolve({ jobId: 'job-aud' })
      })
      const { audioInput } = renderPage()
      await userEvent.upload(audioInput, audioFile('standup.mp3', 'audio/mpeg', 2048))
      await screen.findByDisplayValue('standup')
      await userEvent.click(screen.getByRole('button', { name: 'Upload & transcribe' }))

      await waitFor(() => expect(screen.getByText('detail page')).toBeInTheDocument())
      expect(postMock).toHaveBeenCalledWith('/sources', { title: 'standup' })
      expect(postMock).toHaveBeenCalledWith('/upload/presign', {
        sourceId: 'src-aud',
        contentType: 'audio/mpeg',
        fileSizeBytes: 2048,
      })
      expect(postMock).toHaveBeenCalledWith('/sources/src-aud/jobs', {
        sourceId: 'src-aud',
        model: 'small',
      })
    })

    it('rejects an unsupported audio type with a toast and does not advance', async () => {
      // `accept="audio/*"` lets a .flac through the picker, but it isn't one of the five presignable
      // content types, so the form must reject it before any network call.
      const { audioInput } = renderPage()
      await userEvent.upload(audioInput, audioFile('recording.flac', 'audio/flac'))
      expect(
        await screen.findByText(
          'That’s not a supported audio file. Use .webm, .mp4/.m4a, .mp3, .wav, or .ogg.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Upload & transcribe' })).not.toBeInTheDocument()
    })

    it('surfaces an error and stays put when the S3 upload fails', async () => {
      xhrStatus = 500
      postMock.mockImplementation((path: string) => {
        if (path === '/sources') return Promise.resolve({ source: { sourceId: 'src-fail' } })
        if (path === '/upload/presign')
          return Promise.resolve({ uploadUrl: 'https://s3/put', s3Key: 'k', expiresIn: 900 })
        return Promise.resolve({ jobId: 'job-fail' })
      })
      const { audioInput } = renderPage()
      await userEvent.upload(audioInput, audioFile('standup.wav', 'audio/wav'))
      await screen.findByDisplayValue('standup')
      await userEvent.click(screen.getByRole('button', { name: 'Upload & transcribe' }))

      expect(
        await screen.findByText('Something went wrong uploading your audio. Please try again.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('detail page')).not.toBeInTheDocument()
      // The enqueue must not fire when the upload never succeeded.
      expect(postMock).not.toHaveBeenCalledWith('/sources/src-fail/jobs', expect.anything())
    })
  })

  describe('record path', () => {
    it('shows the start-recording control', () => {
      getUserMediaOk = true
      renderPage()
      expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
    })

    it('records, presigns, uploads the webm, enqueues transcription, and routes to detail', async () => {
      getUserMediaOk = true
      xhrStatus = 200
      postMock.mockImplementation((path: string) => {
        if (path === '/sources') return Promise.resolve({ source: { sourceId: 'src-rec' } })
        if (path === '/upload/presign')
          return Promise.resolve({ uploadUrl: 'https://s3/put', s3Key: 'k', expiresIn: 900 })
        return Promise.resolve({ jobId: 'job-rec' })
      })
      renderPage()
      await userEvent.click(screen.getByRole('button', { name: 'Start recording' }))
      await userEvent.click(await screen.findByRole('button', { name: /Recording,/ }))

      await waitFor(() => expect(screen.getByText('detail page')).toBeInTheDocument())
      expect(postMock).toHaveBeenCalledWith('/sources', expect.objectContaining({ title: expect.any(String) }))
      expect(postMock).toHaveBeenCalledWith('/upload/presign', {
        sourceId: 'src-rec',
        contentType: 'audio/webm',
        fileSizeBytes: 16,
      })
      expect(postMock).toHaveBeenCalledWith('/sources/src-rec/jobs', {
        sourceId: 'src-rec',
        model: 'small',
      })
    })

    it('surfaces a permission-denied message and does not start recording', async () => {
      getUserMediaOk = false
      renderPage()
      await userEvent.click(screen.getByRole('button', { name: 'Start recording' }))

      expect(
        await screen.findByText(
          'Heediq needs microphone access to record. Allow it in your browser settings, then try again.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Recording,/ })).not.toBeInTheDocument()
      getUserMediaOk = true
    })
  })
})
