# Select

## Purpose
Single-value select wrapper built on Radix `Select`. Used for role/group pickers in the assignment
screen (D-102 Phase 4).

## Props
- `label: string`, `options: { value, label }[]`, `value?`, `onValueChange?`, `placeholder?`,
  `disabled?`, `error?`, `id?`.

## States
default · hover · focus-visible · disabled · error (via `error` prop, styled like `Input`).

## Usage
```tsx
<Select
  label="Role"
  options={roles.map((r) => ({ value: r.roleId, label: r.name }))}
  value={selectedRoleId}
  onValueChange={setSelectedRoleId}
  placeholder="Choose a role"
/>
```
