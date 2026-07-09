# Modal

## Purpose
Dialog wrapper built on Radix `Dialog`. Used for the role/group create-edit forms and the user
role-assignment picker (D-102 Phase 4). Focus trap and Esc/overlay-click close come from Radix for
free — never reimplement that in feature code.

## Key Files
- `Modal.tsx` — `Modal` (root, controls `open`/`onOpenChange`), `Modal.Header`, `Modal.Title`,
  `Modal.Description`, `Modal.Body` (scrollable), `Modal.Footer` (action row).

## States
open · closed. The close (`X`) button and overlay click and `Esc` all call `onOpenChange(false)`.

## Usage
```tsx
<Modal open={open} onOpenChange={setOpen}>
  <Modal.Header>
    <Modal.Title>Create role</Modal.Title>
    <Modal.Description>Name it and pick its permissions.</Modal.Description>
  </Modal.Header>
  <Modal.Body>{/* form */}</Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
    <Button loading={isPending} onClick={submit}>Save</Button>
  </Modal.Footer>
</Modal>
```
