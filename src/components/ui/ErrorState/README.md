# ErrorState

## Purpose
Designed error branch for any data-fetch or async-flow surface, per `04-loading-and-feedback.md`
§9 — a failed fetch/flow must never leave the user staring at a blank screen. Pairs with `Card`'s
implicit loading (skeleton) and success (content) branches.

## Props / variants
No variants — single treatment. `title` (required), `description` (optional), `onRetry` (optional
callback — omit to render without a retry action), `retryLabel` (optional override of the default
"Retry" button label, useful for i18n or a more specific action like "Try signing in again").

## States
Static — the retry button it renders internally is a standard kit `Button` and carries its own
states (loading/disabled handled by the caller if the retry itself is async).

## Usage
```tsx
<ErrorState
  title={t('authCallback.error.title')}
  description={t('authCallback.error.description')}
  onRetry={() => navigate('/')}
/>
```
