# Spinner

## Purpose
Indeterminate loading indicator. Used inside `Button`'s loading state and standalone for inline
async regions (per `04-loading-and-feedback.md` §3).

## Props / variants
- `size`: `sm` (16px) · `md` (20px, default) · `lg` (24px)
- `aria-label`: defaults to `"Loading"`, override for context-specific announcements

## States
Single visual state (spinning). Respects `prefers-reduced-motion` (falls back to static, no spin).

## Usage
```tsx
<Spinner size="sm" aria-label="Refreshing sources" />
```
