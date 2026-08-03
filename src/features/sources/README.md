# Sources (`src/features/sources/`)

## Purpose
The read side of a Source in the Context Library era: the **library list** of all the org's Sources
(newest-first, cursor-paginated) plus a single Source's Summary (transcript + gist, D-135) and its
curated `ExtractedItem`s (D-135), grouped by category. Step 5 slice B. Powers `SourcesLibraryPage`
and `SourceDetailPage` and feeds the review wizard (slice C).

## Key Files
- `sources-api.ts` — TanStack Query hooks: `useSourcesList` (`GET /sources`, a **`useInfiniteQuery`**
  so every loaded page shares the one `sourceKeys.list()` cache entry — a WS-driven
  `invalidateQueries` then refetches all pages and status badges stay live across the whole list),
  `useSource` (`GET /sources/:id`), `useSourceSummary` (`GET /sources/:id/summary` — **404 is treated
  as "not ready yet" → `summary: null`**, not an error, since the summarizer may not have run),
  `useSourceItems` (`GET /sources/:id/items`, the endpoint added in heediq-api#48).
  `SOURCE_STATUS_TONE` maps `SourceStatus` → Badge tone (shared by the list and the detail header).
  `groupByCategory()` groups items preserving first-seen order.
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
- Backend: `GET /sources/:id`, `GET /sources/:id/summary`, `GET /sources/:id/items`.

## Testing
- `__tests__/ExtractedItemsList.test.tsx` — grouping/order, provenance + confidence + status badge,
  quote-omitted case.
- `../../routes/__tests__/SourceDetailPage.test.tsx` — full render, Review action + navigation,
  404-summary-as-not-ready, empty items, source load error + retry.
- `../../routes/__tests__/SourcesLibraryPage.test.tsx` — list render + status badge, empty state,
  load error + retry, row-click navigation, Load more pagination, and a `job_status` WS event
  refetching the list.

## Gotchas
- There's no "list a Context's sources" endpoint yet, so nothing links *into* source detail from a
  Context; it's reachable by URL and from the (future) sources library / review flow. Add a
  `?contextId=` filter to `GET /sources` when a Context's source list is built.
