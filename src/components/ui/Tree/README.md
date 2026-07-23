# Tree

## Purpose
Keyboard-operable hierarchical tree, built for the Context Library's self-nesting Contexts
(`parentContextId`, D-134). A proper ARIA tree widget (`03-ui-kit.md` §6) — not a styled list — so
it's fully navigable without a mouse.

## Props / variants
- `nodes: TreeNode[]` — `{ id, label, icon?, children? }`, arbitrarily nested.
- `selectedId?` + `onSelect(id)` — **controlled selection** (the caller owns which node is selected).
- `defaultExpandedIds?` — ids expanded on first render; expansion is otherwise managed internally.
- `aria-label` (required) — accessible name for the tree (a `t()` string).

## States
Per row: default / hover / **selected** (`aria-selected`, accent treatment) / **focus-visible**
(accent ring). Expandable rows carry `aria-expanded` and a rotating chevron. Reduced-motion: the
only motion is the chevron rotation via `transition-transform`, which the browser drops under
`prefers-reduced-motion`.

## Keyboard (roving tabindex — one row tabbable at a time)
`↓`/`↑` move focus · `→` expand (or move to first child) · `←` collapse (or move to parent) ·
`Home`/`End` first/last visible row · `Enter`/`Space` select.

## Usage
```tsx
<Tree
  aria-label={t('contextLibrary.treeLabel')}
  nodes={contextNodes}
  selectedId={selectedContextId}
  onSelect={setSelectedContextId}
  defaultExpandedIds={rootIds}
/>
```

## Gotchas
- Selection is controlled; expansion is not — seed initial open state with `defaultExpandedIds`.
- `label` is a `ReactNode`, but keep it text-like (it's inside a `truncate` span); provide `aria-label`
  on the tree for the overall widget name (D-075 — no literal strings).
