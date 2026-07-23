# Stepper

## Purpose
Horizontal step indicator for multi-step flows — built for the review wizard (D-137 steps 1–2).
Presentational only: it shows progress; the parent owns the active index and all navigation.

## Props / variants
No variants. `steps: { id, label }[]`, `current` (zero-based index of the active step),
`aria-label` (required — a `t()` name for the list). Steps before `current` render completed
(accent + check); the active step is accented and carries `aria-current="step"`; later steps are muted.

## States
Per step: completed / active / upcoming. Purely derived from `current` — no interactive state (the
component isn't clickable; wire step navigation in the parent if needed).

## Usage
```tsx
<Stepper
  aria-label={t('reviewWizard.progress')}
  current={stepIndex}
  steps={[
    { id: 'placement', label: t('reviewWizard.steps.placement') },
    { id: 'items', label: t('reviewWizard.steps.items') },
  ]}
/>
```
