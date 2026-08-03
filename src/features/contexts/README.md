# Context Library (`src/features/contexts/`)

## Purpose
The frontend for the Context Library (D-124–D-144) — browsing the user's Contexts as a tree,
viewing a Context's details, and creating Contexts. First of the Step 5 web slices; source detail,
the review wizard, and the chat panel land alongside it.

## Key Files
- `contexts-api.ts` — TanStack Query hooks + shared query keys. `useContextTree()` →
  `GET /contexts/tree` (`{ tree: ContextTreeNode[] }`, nested by `parentContextId`, D-134);
  `useContextDetail(id)` → `GET /contexts/:id`; `flattenContexts()` builds the depth-indented
  parent-picker list. `contextKeys.all` is invalidated on create so tree + detail refetch.
- `CreateContextModal.tsx` — kit `Modal` form (name / domain / optional description / optional
  parent). Create mutation (`POST /contexts`, `CreateContextRequestSchema`) with success/error
  `Toast`; name validation; submit guarded by `Button` loading (D-120). Contexts are created
  `personal` (the request omits `visibility`, defaulting server-side) — visibility/group management
  is deferred (see workspace `BACKLOG.md`, cross-org sharing UI).
- `ContextDetailPanel.tsx` — selected Context's metadata (name, `domain`/`visibility` badges,
  description, created date) + its sub-context list (from the tree node) + the Context's **Decision
  Ledger** (embeds `../ledger/LedgerSection`, D-136/D-148 — see `../ledger/README.md`). Own
  loading/error branches; the ledger section owns its own.
- `../../routes/ContextLibraryPage.tsx` — composes the above into a responsive split view; owns
  URL-driven selection.

## Data Flow
- Route `/contexts` (library) and `/contexts/:contextId` (a Context selected) both render
  `ContextLibraryPage`, gated by `ProtectedRoute` + `<Can permission="context:read">`.
- Selection is **URL-driven**: clicking a tree node `navigate('/contexts/:id')`; the page reads
  `useParams().contextId`. Deep links work. On mobile the tree and detail swap by selection; on
  `md+` they sit side by side.
- The tree/detail/create surfaces each satisfy `04-loading-and-feedback.md`: Skeleton (loading),
  ErrorState+retry (error), EmptyState (no data). All copy via `t()` — `domains.*`,
  `contextVisibility.*`, `contextStatus.*`, `contextLibrary.*`; `DomainSchema` slugs → `domains.<slug>`.

## Contracts
- `@heediq/shared` (`^0.15.3`): `Context`, `CreateContextRequest`, `DomainSchema`,
  `ContextVisibilitySchema`. The tree node is `Context & { children }` (mirrors the API's tree shape).
- Backend routes: `GET /contexts/tree`, `GET /contexts/:id`, `POST /contexts` (all from heediq-api
  `src/routes/contexts.ts`).

## Testing
- `__tests__/CreateContextModal.test.tsx` — name validation blocks the API call; successful create
  posts the right body and calls `onCreated`; empty description/parent are omitted.
- `../../routes/__tests__/ContextLibraryPage.test.tsx` — tree render, empty state, error+retry,
  select→navigate→detail, deep-link. API mocked at the `api-client` boundary.
- Kit primitives added for this slice carry their own tests: `Tree`, `EmptyState`, `Skeleton`.

## Gotchas
- The `Tree` seeds its expanded state once at mount from `defaultExpandedIds`; it mounts only after
  the tree query resolves, so root ids are present. Nodes added later (e.g. a new sub-context) don't
  auto-expand their parent — acceptable for now.
- Radix `Select` doesn't drive cleanly via `userEvent` in jsdom, so the modal tests submit with the
  default domain rather than changing the select — enough to assert the request contract.
