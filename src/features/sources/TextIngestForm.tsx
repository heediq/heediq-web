import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FileText, Upload } from 'lucide-react'
import { Button, Card, Input, useToast } from '../../components/ui'
import { useAsyncAction } from '../../lib/useAsyncAction'
import { useIngestText } from './sources-api'
import { track } from '../../lib/analytics/analytics'

/** Cap the on-screen preview — the full file is still what gets ingested. */
const PREVIEW_CHARS = 2000

/**
 * The text-file ingest method of the Capture landing (D-150): pick a `.txt`/`.md` file, read it in
 * the browser, confirm/edit the title, and push it straight into the Context Library — no
 * transcription. On success it routes to the new Source's detail page, where the async
 * summarize → classify → extract progress lands over the WS framework.
 */
export function TextIngestForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ingestText = useIngestText()

  const [fileName, setFileName] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the user re-pick the same file after clearing
    if (!file) return
    let content: string
    try {
      content = await file.text()
    } catch {
      toast.error(t('capture.text.readError'))
      return
    }
    if (!content.trim()) {
      toast.error(t('capture.text.emptyFile'))
      return
    }
    setFileName(file.name)
    setText(content)
    // Default the title to the filename (sans extension), but never clobber a title the user typed.
    setTitle((current) => current || file.name.replace(/\.[^.]+$/, ''))
  }

  const canSubmit = title.trim().length > 0 && text.trim().length > 0

  const submit = useAsyncAction(async () => {
    if (!canSubmit) return
    track('capture_started', { method: 'text' })
    try {
      const sourceId = await ingestText({ title: title.trim(), text })
      navigate(`/sources/${sourceId}`)
    } catch {
      toast.error(t('capture.text.submitError'))
    }
  })

  return (
    <Card className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => void onFileChange(e)}
      />

      {text ? (
        <>
          <Input
            label={t('capture.text.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-text-secondary">
              {t('capture.text.previewLabel', { name: fileName })}
            </span>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-sm border border-border bg-surface-1 p-3 text-body text-text-secondary">
              {text.slice(0, PREVIEW_CHARS)}
              {text.length > PREVIEW_CHARS ? '…' : ''}
            </pre>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void submit.run()} loading={submit.pending} disabled={!canSubmit}>
              {t('capture.text.submit')}
            </Button>
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
              {t('capture.text.chooseAnother')}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <FileText className="size-8 text-text-secondary" aria-hidden="true" />
          <p className="text-body text-text-secondary">{t('capture.text.prompt')}</p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" /> {t('capture.text.choose')}
          </Button>
        </div>
      )}
    </Card>
  )
}
