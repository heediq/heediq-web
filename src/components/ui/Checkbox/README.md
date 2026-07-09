# Checkbox

## Purpose
Single-purpose checkbox primitive, built on Radix `Checkbox`. Used by `RoleForm`'s permission
multi-select (D-102 Phase 4). Not a generic form-kit — one control, one job.

## Props
- All `@radix-ui/react-checkbox` `Checkbox.Root` props (`checked`, `onCheckedChange`, `disabled`, …).
- `label?: string` — renders an associated `<label>`; omit for a bare checkbox with your own label markup.

## States
default · hover · focus-visible · disabled · checked · unchecked. No loading/error state — a
checkbox has no async lifecycle of its own; wrap it in a loading/error-aware parent if needed.

## Usage
```tsx
<Checkbox label="sources:read" checked={selected} onCheckedChange={(v) => toggle(v === true)} />
```
