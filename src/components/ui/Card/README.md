# Card

## Purpose
Composed container for grouped content (source list items, summary panels). Composition over
config per `03-ui-kit.md` §5 — subcomponents, not a giant prop list.

## Props / variants
No variants yet — single `surface-1` treatment. Accepts all native `div` props via `className`
passthrough (layout composition only, no bespoke visual overrides — `03-ui-kit.md` §1).

## States
Static container — no interactive states of its own. Interactive content inside (buttons, links)
carries its own states.

## Usage
```tsx
<Card>
  <Card.Header>
    <Card.Title>Weekly sync — Jul 2</Card.Title>
    <Card.Description>42 min · transcribed</Card.Description>
  </Card.Header>
  <Card.Content>3 requirements, 2 open questions extracted.</Card.Content>
</Card>
```
