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

/** A File whose `text()` resolves to `content` — jsdom's Blob doesn't implement text(). */
function textFile(name: string, content: string): File {
  const file = new File([content], name, { type: 'text/plain' })
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(content) })
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
  const fileInput = utils.container.querySelector('input[type="file"]') as HTMLInputElement
  return { ...utils, fileInput }
}

describe('CapturePage', () => {
  // Deliberately no `beforeEach` mock reset/clear/implementation: on vitest v2, touching a vi.fn's
  // state between tests makes its spy result-tracking flag the *already-awaited-and-caught*
  // rejection in the "ingest fails" case below as an unhandled rejection, failing the suite
  // spuriously. The tests that call the API set their own implementation, and the others never hit
  // it, so cross-test isolation isn't needed here.

  it('shows the text-file prompt before a file is chosen', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Choose a text file' })).toBeInTheDocument()
  })

  it('prefills the title from the filename and previews the content once a file is chosen', async () => {
    const { fileInput } = renderPage()
    await userEvent.upload(fileInput, textFile('sprint-notes.txt', 'hello world'))
    expect(await screen.findByDisplayValue('sprint-notes')).toBeInTheDocument()
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('creates a source, ingests the text, and routes to the source detail on submit', async () => {
    postMock.mockImplementation((path: string) =>
      path === '/sources'
        ? Promise.resolve({ source: { sourceId: 'src-new' } })
        : Promise.resolve({ jobId: 'job-1' }),
    )
    const { fileInput } = renderPage()
    await userEvent.upload(fileInput, textFile('notes.md', 'the meeting content'))
    await screen.findByDisplayValue('notes')
    await userEvent.click(screen.getByRole('button', { name: 'Add to library' }))

    await waitFor(() => expect(screen.getByText('detail page')).toBeInTheDocument())
    expect(postMock).toHaveBeenCalledWith('/sources', { title: 'notes' })
    expect(postMock).toHaveBeenCalledWith('/sources/src-new/text', { text: 'the meeting content' })
  })

  it('surfaces an error and stays put when ingest fails', async () => {
    postMock.mockRejectedValue(new Error('boom'))
    const { fileInput } = renderPage()
    await userEvent.upload(fileInput, textFile('notes.txt', 'content'))
    await screen.findByDisplayValue('notes')
    await userEvent.click(screen.getByRole('button', { name: 'Add to library' }))

    expect(
      await screen.findByText('Something went wrong adding your file. Please try again.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('detail page')).not.toBeInTheDocument()
  })

  it('rejects an empty file with a message instead of advancing', async () => {
    const { fileInput } = renderPage()
    await userEvent.upload(fileInput, textFile('empty.txt', '   '))
    expect(
      await screen.findByText('That file is empty — pick one with some text in it.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to library' })).not.toBeInTheDocument()
  })
})
