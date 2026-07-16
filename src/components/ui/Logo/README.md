# Logo

## Purpose
Brand mark (amber waveform bars, `public/brand/heediq-stubs.svg`) rendered next to the "heediq"
wordmark — `HomePage`'s sign-in/sign-up screen and `TopBar`. Single source so the mark never gets
re-implemented or re-cropped per screen.

## Props / variants
- `size`: `sm` (20px) · `md` (28px, default) · `lg` (40px)

## States
Single visual state (static image). No loading/error state — it's a static local asset, not a fetch.

## Usage
```tsx
<div className="flex items-center gap-2">
  <Logo size="sm" />
  <h1 className="text-h2">{t('home.title')}</h1>
</div>
```
