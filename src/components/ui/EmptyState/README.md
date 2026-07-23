# EmptyState

## Purpose
Designed empty branch for any data surface, per `04-loading-and-feedback.md` §9 — genuinely-no-data
is distinct from loading (`Skeleton`) and error (`ErrorState`). Shows a short explanation and an
optional primary action instead of a bare blank region.

## Props / variants
No variants — single treatment. `title` (required), `description` (optional), `icon` (optional
lucide icon component, defaults to `Inbox`), `action` (optional `ReactNode` slot — pass a kit
`Button` so its copy stays in the caller via `t()`).

## States
Static — any interactivity comes from the `action` you pass (a kit `Button` with its own states).

## Usage
```tsx
<EmptyState
  title={t('contextLibrary.empty.title')}
  description={t('contextLibrary.empty.description')}
  icon={FolderTree}
  action={<Button onClick={openCreate}>{t('contextLibrary.empty.action')}</Button>}
/>
```
