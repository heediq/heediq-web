# Button

## Purpose
Primary interactive control for all actions in the app. The three-state Listen button (D-026) is
built on top of this primitive with its own composed component, not a fork.

## Props / variants
- `variant`: `primary` (default) · `secondary` · `ghost` · `danger`
- `size`: `sm` · `md` (default) · `lg`
- `loading`: boolean — shows `Spinner`, sets `aria-busy`, disables the control (prevents double-submit per `04-loading-and-feedback.md` §4)
- `asChild`: render as a different element (e.g. a router `<Link>`) via Radix `Slot`, keeping styling but changing the underlying tag

## States
default · hover · active/pressed · focus-visible (accent ring) · disabled · loading — all declared per `03-ui-kit.md` §4.

## Usage
```tsx
<Button variant="primary" onClick={handleSave} loading={isSaving}>
  Save
</Button>

<Button asChild variant="ghost">
  <Link to="/sources">View sources</Link>
</Button>
```

## Gotchas & Constraints
- `asChild` renders via Radix `Slot`, which requires exactly one React element child (`React.Children.only`
  under the hood). The component never injects the loading spinner or a `disabled`/`aria-busy` attribute
  when `asChild` is true — doing so used to add a stray `null` sibling and crash with "Slot failed to
  slot onto its children" the first time `asChild` was actually used (it had been documented but unused
  until `TopBar` adopted it). Don't pass `loading` together with `asChild`.
