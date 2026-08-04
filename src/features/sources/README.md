# Sources (`src/features/sources/`)

## Purpose
Both sides of a Source in the Context Library era. **Read:** the **library list** of all the org's
Sources (newest-first, cursor-paginated) plus a single Source's Summary (transcript + gist, D-135)
and its curated `ExtractedItem`s (D-135), grouped by category. **Write (ingest, D-150):** the
**text-file capture** path — the first of the Capture landing's three ingest methods (D-026/D-150) —
which pushes a `.txt`/`.md` file straight into the library, skipping transcription. Step 5 slice B +
the Capture UI. Powers `CapturePage`, `SourcesLibraryPage`, and `SourceDetailPage` and feeds the
review wizard (slice C).

## Key Files
- `sources-api.ts` — TanStack Query hooks: `useSourcesList` (`GET /sources`, a **`useInfiniteQuery`**
  so every loaded page shares the one `sourceKeys.list()` cache entry — a WS-driven
  `invalidateQueries` then refetches all pages and status badges stay live across the whole list),
  `useSource` (`GET /sources/:id`), `useSourceSummary` (`GET /sources/:id/summary` — **404 is treated
  as "not ready yet" → `summary: null`**, not an error, since the summarizer may not have run),
  `useSourceItems` (`GET /sources/:id/items`, the endpoint added in heediq-api#48).
  `SOURCE_STATUS_TONE` maps `SourceStatus` → Badge tone (shared by the list and the detail header).
  `groupByCategory()` groups items preserving first-seen order. `createSourceShell(title)` — the
  `POST /sources {title}` create step shared by both ingest write paths. `useIngestText` — the
  text-file ingest write path: `createSourceShell` then `POST /sources/:id/text {text}` to push the
  content in (enqueues summarize → classify → extract, skips transcription); resolves to the new
  `sourceId` and invalidates `sourceKeys.list()`. `useUploadAudio` — the audio-file ingest write path:
  `createSourceShell` → `POST /upload/presign {sourceId, contentType, fileSizeBytes}` (also stamps
  `audioS3Key`+`sourceType='audio'` server-side, a `/jobs` precondition) → **`XMLHttpRequest` PUT** of
  the File to the presigned S3 URL (XHR, not `fetch`, because only XHR reports upload progress via
  `upload.onprogress`; raw S3, `Content-Type` = the signed type, no auth header) → `POST /sources/:id/
  jobs {sourceId, model:'small'}` to enqueue transcription (`'small'` is free-tier-safe; `large-v3`
  403s on free, D-060). Takes an `onProgress(pct)` callback, resolves to `sourceId`, invalidates the
  list.
- `TextIngestForm.tsx` — the text-file ingest method of the Capture landing: a kit `Button`-driven
  file picker (`.txt`/`.md`, read in-browser via `File.text()`), a title `Input` prefilled from the
  filename, a read-only preview, and a submit that runs `useIngestText` behind `useAsyncAction`
  (D-120 double-submit guard) and routes to the new Source's detail page. Empty/read-error files are
  rejected with a toast; all copy is `t()`-driven (D-075/D-076).
- `AudioIngestForm.tsx` — the audio-file ingest method of the Capture landing: a kit `Button`-driven
  audio file picker, a title `Input` prefilled from the filename, a determinate kit `Progress` bar
  during the S3 upload, and a submit that runs `useUploadAudio` behind `useAsyncAction`. File type is
  resolved **by extension** (`.webm/.mp4/.m4a/.mp3/.wav/.ogg` → the five presignable content types;
  browsers report audio MIME inconsistently) and validated (plus a 2 GB size cap) **before** any
  network call — wrong-type/oversize files are rejected with a toast. Routes to the new Source's detail
  page on success; all copy is `t()`-driven.
- `../../routes/CapturePage.tsx` — the Capture landing (route `/capture`): a titled shell hosting the
  ingest methods — `AudioIngestForm` and `TextIngestForm`, each under a method heading. Live-record is
  the remaining method (PR3d).
- `../../routes/SourcesLibraryPage.tsx` — the library list: a `Table` of Title/Status/Created with
  `interactive` rows navigating to `/sources/:id`, its own loading/empty/error branches, a **Load
  more** button (`hasNextPage`), and `useWsEvent('job_status')`/`('classification_ready')`
  invalidating the list so badges update live (reuses existing events, no new one — D-111).
- `ExtractedItemsList.tsx` — renders items grouped by `category` (Domain `extractionFields` slugs →
  `t('extractionCategories.<slug>')`), each with its text, a status `Badge`
  (proposed/kept/discarded), the `sourceQuote` provenance (a blockquote), and a confidence caption.
- `../../routes/SourceDetailPage.tsx` — composes header (title, status + classification badges,
  a **Review** action when `classification === 'pending_review'`), gist, extracted items, and the
  transcript (JetBrains Mono block). Each async region has its own loading/empty/error branch.

## Data Flow
- **Capture (ingest):** `/capture` (`ProtectedRoute` + `AppShell`, gated by `Can permission=
  "sources:create"` — falls back to `/sources`). Two write paths: **text** → `useIngestText`
  (`POST /sources` then `POST /sources/:id/text`) → summarize → classify → extract (no transcription);
  **audio** → `useUploadAudio` (`POST /sources` → `POST /upload/presign` → XHR PUT to S3 with progress
  → `POST /sources/:id/jobs {model:'small'}`) → transcribe → summarize → classify → extract. Both
  navigate to `/sources/:sourceId`, where the async pipeline progress lands over the WS framework.
  `/capture` is also the
  post-auth landing (`AuthCallbackPage`, `HomePage`), and `SourcesLibraryPage` links to it via a
  `Can`-gated **Capture** CTA (header + empty state).
- Route `/sources/:sourceId` (existing, `ProtectedRoute` + `AppShell`). Three independent queries so
  each section loads/fails on its own (summary and items never block the header).
- The **Review** button routes to `/sources/:id/review` — the D-137 review wizard
  (`src/routes/ReviewWizardPage.tsx`, slice C): placement (step 1) then keep/discard items (step 2),
  submitting `POST /sources/:id/review`. It reuses `useSourceItems`/`groupByCategory` here and the
  `contexts` feature's tree + `CreateContextModal`.
- `SourceDetailPage` also subscribes to `useWsEvent('classification_ready')` and invalidates its
  source/items/summary queries when ingest classification lands for this source (D-111/D-133).

## Contracts
- `@heediq/shared`: `Source`, `Summary`, `ExtractedItem`, and the `SourceStatus`/
  `SourceClassification`/`ExtractedItemStatus` enums. i18n: `sourceStatus.*`,
  `sourceClassification.*`, `extractedItemStatus.*`, `extractionCategories.*`, `sourceDetail.*`.
- Backend: `GET /sources/:id`, `GET /sources/:id/summary`, `GET /sources/:id/items`,
  `POST /sources` (`CreateSourceRequestSchema`), `POST /sources/:id/text` (`IngestTextRequestSchema`),
  `POST /upload/presign` (`PresignUploadRequest/ResponseSchema` — `contentType` ∈ the five audio
  types, 2 GB cap), `POST /sources/:id/jobs` (`EnqueueJobRequestSchema`, `model` = `WhisperModel`).
  i18n for capture: `capture.*` (incl. `capture.audio.*`), `sourcesLibrary.capture`, `common.progress`.

## Testing
- `__tests__/ExtractedItemsList.test.tsx` — grouping/order, provenance + confidence + status badge,
  quote-omitted case.
- `../../routes/__tests__/SourceDetailPage.test.tsx` — full render, Review action + navigation,
  404-summary-as-not-ready, empty items, source load error + retry.
- `../../routes/__tests__/SourcesLibraryPage.test.tsx` — list render + status badge, empty state,
  load error + retry, row-click navigation, Load more pagination, a `job_status` WS event
  refetching the list, and the `Can`-gated **Capture** CTA linking to `/capture`.
- `../../routes/__tests__/CapturePage.test.tsx` — both ingest methods. Text: prompt, filename→title
  prefill + preview, create + ingest + navigate, error-stays-put, empty-file rejection. Audio: prompt,
  filename→title prefill, create + presign + upload + enqueue + navigate (asserts the presign
  `fileSizeBytes` and `model:'small'`), unsupported-audio-type rejection, and S3-upload-failure
  stays-put (asserts `/jobs` never fires). The S3 PUT is exercised via a stubbed `XMLHttpRequest`
  (`FakeXHR`) whose `status` is set per-test; the two file inputs are told apart by their `accept`.
  **Note:** intentionally no `beforeEach` mock reset — see the comment in it; resetting a `vi.fn`
  between tests trips a vitest v2 spy-result-tracking bug that mis-flags the caught failure-path
  rejections as unhandled.

## Gotchas
- There's no "list a Context's sources" endpoint yet, so nothing links *into* source detail from a
  Context; it's reachable by URL and from the (future) sources library / review flow. Add a
  `?contextId=` filter to `GET /sources` when a Context's source list is built.
