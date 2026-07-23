# Skeleton

## Purpose
The layout-preserving loading placeholder, per `04-loading-and-feedback.md` §2/§3 — a page or
section that's loading shows a skeleton that mirrors the eventual layout, not a centered spinner or
blank screen. Prevents layout shift when real content arrives (§11 "no layout shift").

## Props / variants
No variants — a single tokenized block. It's a plain `div`, so size/shape come from `className`
(`h-4 w-32`, `h-9 w-full`, `rounded-full` for avatars). Compose several to build a skeleton that
matches the real content's shape.

## States
Static. The pulse animation is applied via `motion-safe:animate-pulse`, so it animates for users
who allow motion and renders as a still block under `prefers-reduced-motion`.

## Usage
```tsx
// A skeleton list row
<div className="flex items-center gap-3">
  <Skeleton className="size-8 rounded-full" />
  <div className="flex flex-1 flex-col gap-2">
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-3 w-1/3" />
  </div>
</div>
```
