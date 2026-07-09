# Toast

## Purpose
Centralized outcome feedback for mutations (success/error), per `04-loading-and-feedback.md` §7/§11 —
"one Toaster", never one-off markup per screen.

## Usage
Wrap the app once in `<ToastProvider>` (done in `App.tsx`, inside `QueryClientProvider`). Any
component calls `useToast()` to fire a toast:

```tsx
const toast = useToast()
toast.success(t('rolesSettings.roles.createSuccess'))
toast.error(t('rolesSettings.roles.saveError'))
```

`useToast` throws if called outside a `ToastProvider` — this is a programmer error, not a runtime
condition to handle gracefully.

## States
- `success` tone (green) and `danger` tone (red), each with an icon (`CheckCircle2`/`XCircle`).
- Auto-dismisses after 5s; also dismissible via the close button (`aria-label` from `common.dismiss`).
- Stacks multiple toasts bottom-right; each is `role="alert"` for screen readers.

## Gotchas
Not a queue/undo mechanism — for destructive actions requiring confirmation, pair with a `Modal`
confirm step before calling the mutation, not after.
