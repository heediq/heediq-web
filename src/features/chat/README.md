# Context chat (`src/features/chat/`)

## Purpose
The Context chat panel (D-138/D-139/D-145) — a ChatGPT/Claude.ai-grade streaming chat over a
Context's accumulated memory. Step 5 slice D, and the flagship surface held to
`04-loading-and-feedback.md` §6 specifically. Lazy-loaded (see `App.tsx`) so its markdown/highlight
deps stay out of the initial bundle.

## Key Files
- `chat-api.ts` — TanStack Query hooks: `useConversations`/`useCreateConversation` (contextId-scoped),
  `useMessages`/`usePostMessage` (conversationId-scoped). Posting a message persists the user turn and
  enqueues the assistant job server-side; the reply arrives over WS.
- `useChatStream.ts` — assembles a streaming assistant turn from `chat_delta`/`chat_complete`/
  `chat_failed` (D-139/D-145) for one conversation. `begin()` shows the thinking indicator the instant
  the user sends. Rendering dedupes on `messageId` so the streamed text stays until the refetched
  history includes the persisted message (no flash). `stop()` is a **client-side halt** (see Gotchas).
- `ChatThread.tsx` — the thread: server history + optimistic user bubble + the pending assistant turn,
  scroll-aware auto-scroll (auto-scrolls only while at bottom; "jump to latest" otherwise), Retry on a
  failed turn, and the composer.
- `ChatComposer.tsx` — auto-growing textarea, Enter-to-send / Shift+Enter newline, IME-safe, Stop while
  streaming, send disabled mid-turn (one turn at a time — the §4 double-submit guard).
- `ChatMessage.tsx` — user vs assistant bubbles (assistant renders `Markdown`), per-turn copy, entrance
  motion via `src/lib/motion.ts`.
- `Markdown.tsx` — `react-markdown` + `remark-gfm` + `rehype-highlight`, styled with kit tokens via
  element overrides. Raw HTML is off (react-markdown's safe default) → no sanitizer needed.
- `ThinkingIndicator.tsx`, `ConversationList.tsx`, and the route `src/routes/ContextChatPage.tsx`
  (conversation list ↔ thread, responsive; entry point is the **Chat** button on `ContextDetailPanel`).

## Data Flow
- Route `/contexts/:contextId/chat` (gated `<Can context:read>`, lazy). Conversation selection is local
  state (mobile swaps list ↔ thread).
- Send: optimistic user bubble + `begin()` (thinking) immediately → `POST /conversations/:id/messages`
  → worker streams `chat_delta`…`chat_complete` over WS → `useChatStream` assembles → on complete the
  history refetches and the persisted message replaces the streamed one seamlessly.

## Contracts
- `@heediq/shared`: `Conversation`, `ChatMessage`, `CreateConversationRequest`/`CreateMessageRequest`,
  and the `chat_delta`/`chat_complete`/`chat_failed` WS payloads (`WsEventPayloadMap`).
- Backend: `GET/POST /conversations?contextId=`, `GET/POST /conversations/:id/messages`.

## Testing
- `useChatStream.test.tsx` (delta assembly / complete / cross-conversation ignore / failed / stop),
  `ChatComposer.test.tsx` (enter / shift-enter / empty / stop / in-flight), `ChatThread.test.tsx`
  (send→thinking→stream→refetch, failed+retry). WS mocked by capturing the `useWsEvent` handlers.

## Gotchas & limitations (backend follow-ups)
- **`stop()` is client-side only** — it halts token application, but the worker keeps generating and
  persists the full message (no cancel endpoint). A true server-side cancel is an engineering-backlog
  item.
- **Retry re-posts the last user message** as a new turn (no regenerate endpoint), so it adds a user
  message rather than regenerating in place. A no-duplicate regenerate is a backend follow-up.
- **New chats are created with a default title** ("New chat") — no rename/auto-title endpoint yet.
