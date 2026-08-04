import { useCallback } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ExtractedItem,
  PresignUploadRequest,
  PresignUploadResponse,
  Source,
  SourceStatus,
  Summary,
} from '@heediq/shared'
import { apiClient, ApiClientError } from '../../lib/api-client'

/** The whisper model sent at `/jobs` — `'small'` is the free-tier-safe transcription model;
 * `'large-v3'` is paid-only and 403s on the free tier (D-060), so the audio path always sends
 * `'small'` (a model/tier picker is a later nicety). */
const FREE_TIER_WHISPER_MODEL = 'small' as const

/** Create the empty Source shell shared by every ingest path (`POST /sources {title}`). */
async function createSourceShell(title: string): Promise<string> {
  const { source } = await apiClient.post<{ source: Source }>('/sources', { title })
  return source.sourceId
}

/**
 * PUT a File straight to its presigned S3 URL with determinate upload progress. Uses
 * `XMLHttpRequest`, not `fetch`, because only XHR exposes `upload.onprogress` — `fetch` cannot report
 * request-body upload progress, and this is a potentially multi-GB audio file (2 GB cap). Raw S3: no
 * auth header, and the `Content-Type` must match the type the URL was signed for or S3 rejects the PUT.
 */
function putToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 upload failed (status ${xhr.status})`))
    xhr.onerror = () => reject(new Error('S3 upload network error'))
    xhr.send(file)
  })
}

/** Badge tone per Source status — one mapping shared by the library list and the detail header. */
export const SOURCE_STATUS_TONE: Record<SourceStatus, 'neutral' | 'active' | 'success' | 'danger'> = {
  uploading: 'neutral',
  processing: 'active',
  ready: 'success',
  failed: 'danger',
}

export const sourceKeys = {
  /** The Context Library list (all loaded pages share this single key so a WS-driven
   * invalidation refetches every loaded page, keeping status badges live across the whole list). */
  list: () => ['sources', 'list'] as const,
  detail: (id: string) => ['sources', 'detail', id] as const,
  summary: (id: string) => ['sources', 'summary', id] as const,
  items: (id: string) => ['sources', 'items', id] as const,
}

interface SourcesListPage {
  sources: Source[]
  nextCursor: string | null
}

/**
 * The org's Sources, newest-first, cursor-paginated (GET /sources). An infinite query rather than a
 * per-cursor `useQuery`: it keeps all loaded pages under one cache entry, so `invalidateQueries`
 * after a `job_status`/`classification_ready` WS event refetches every page at once and status
 * badges update live no matter which page a Source is on.
 */
export function useSourcesList() {
  return useInfiniteQuery({
    queryKey: sourceKeys.list(),
    queryFn: ({ pageParam }) =>
      apiClient.get<SourcesListPage>(
        pageParam ? `/sources?cursor=${encodeURIComponent(pageParam)}` : '/sources',
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })
}

/**
 * The text-file ingest path (D-150): create a Source shell (`POST /sources`) then push the file's
 * text into it (`POST /sources/:id/text`), which enqueues summarize → classify → extract and skips
 * transcription. Resolves to the new `sourceId` so the caller can route to its detail page, where
 * the WS-driven status/classification updates land. Invalidates the library list so the new Source
 * appears there immediately.
 */
export function useIngestText() {
  const queryClient = useQueryClient()
  return useCallback(
    async ({ title, text }: { title: string; text: string }): Promise<string> => {
      const sourceId = await createSourceShell(title)
      await apiClient.post<{ jobId: string }>(`/sources/${sourceId}/text`, { text })
      // The new Source now exists (uploading→processing) — refresh the library list so it appears.
      void queryClient.invalidateQueries({ queryKey: sourceKeys.list() })
      return sourceId
    },
    [queryClient],
  )
}

/**
 * The audio-file ingest path (D-150): create a Source shell, presign an S3 upload, PUT the file with
 * live progress, then enqueue transcription (`POST /sources/:id/jobs`). Presign also stamps
 * `audioS3Key`+`sourceType='audio'` on the row server-side — a precondition for `/jobs`, so it must
 * run before the enqueue. Sends `model: 'small'` (free-tier-safe; D-060). Resolves to the new
 * `sourceId` so the caller can route to detail, where transcribe → summarize → classify progress lands
 * over the WS framework. Invalidates the library list so the new Source appears immediately.
 */
export function useUploadAudio() {
  const queryClient = useQueryClient()
  return useCallback(
    async ({
      title,
      file,
      contentType,
      onProgress,
    }: {
      title: string
      file: File
      contentType: PresignUploadRequest['contentType']
      onProgress: (pct: number) => void
    }): Promise<string> => {
      const sourceId = await createSourceShell(title)
      const { uploadUrl } = await apiClient.post<PresignUploadResponse>('/upload/presign', {
        sourceId,
        contentType,
        fileSizeBytes: file.size,
      } satisfies PresignUploadRequest)
      await putToPresignedUrl(uploadUrl, file, contentType, onProgress)
      await apiClient.post<{ jobId: string }>(`/sources/${sourceId}/jobs`, {
        sourceId,
        model: FREE_TIER_WHISPER_MODEL,
      })
      // The new Source now exists (uploading→processing) — refresh the library list so it appears.
      void queryClient.invalidateQueries({ queryKey: sourceKeys.list() })
      return sourceId
    },
    [queryClient],
  )
}

export function useSource(id: string) {
  return useQuery({
    queryKey: sourceKeys.detail(id),
    queryFn: () => apiClient.get<{ source: Source }>(`/sources/${id}`),
  })
}

/**
 * The Source's Summary (transcript + gist, D-135). The endpoint 404s until the summarizer has run,
 * which is a normal "not ready yet" state, not an error — surfaced as `summary: null` so the page
 * can show a waiting state instead of an ErrorState.
 */
export function useSourceSummary(id: string) {
  return useQuery({
    queryKey: sourceKeys.summary(id),
    queryFn: async (): Promise<{ summary: Summary | null }> => {
      try {
        return await apiClient.get<{ summary: Summary }>(`/sources/${id}/summary`)
      } catch (e) {
        if (e instanceof ApiClientError && e.code === 'NOT_FOUND') return { summary: null }
        throw e
      }
    },
  })
}

export function useSourceItems(id: string) {
  return useQuery({
    queryKey: sourceKeys.items(id),
    queryFn: () => apiClient.get<{ items: ExtractedItem[] }>(`/sources/${id}/items`),
  })
}

/** Group items by `category`, preserving first-seen category order. */
export function groupByCategory(items: ExtractedItem[]): { category: string; items: ExtractedItem[] }[] {
  const order: string[] = []
  const byCategory = new Map<string, ExtractedItem[]>()
  for (const item of items) {
    if (!byCategory.has(item.category)) {
      byCategory.set(item.category, [])
      order.push(item.category)
    }
    byCategory.get(item.category)!.push(item)
  }
  return order.map((category) => ({ category, items: byCategory.get(category)! }))
}
