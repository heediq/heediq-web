# Table

## Purpose
Composable table primitive with built-in loading (skeleton rows) and empty states, so list screens
(roles, groups, users) never hand-roll a `<table>` (D-102 Phase 4 is the first consumer).

## Key Files
- `Table.tsx` — `Table` (root, takes `loading`/`loadingRowCount`/`columnCount`/`empty`/`emptyContent`),
  `Table.Header`, `Table.HeaderCell`, `Table.Body`, `Table.Row`, `Table.Cell`.

## States
default row hover · loading (skeleton rows replace `Table.Body`, count via `loadingRowCount`,
column count via `columnCount` so skeleton cells align) · empty (`empty` + `emptyContent` replaces
`Table.Body` with a single centered message row) — mirrors the loading/success/error/empty branches
required by `04-loading-and-feedback.md` (pair `empty`/`loading` with a separate `ErrorState` for the
error branch, rendered instead of the table).

## Usage
```tsx
<Table loading={query.isLoading} empty={query.data?.length === 0} emptyContent={t('roles.empty')} columnCount={3}>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Name</Table.HeaderCell>
      <Table.HeaderCell>Permissions</Table.HeaderCell>
      <Table.HeaderCell />
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {roles.map((role) => (
      <Table.Row key={role.roleId}>
        <Table.Cell>{role.name}</Table.Cell>
        <Table.Cell>{role.permissions.length}</Table.Cell>
        <Table.Cell><Button onClick={() => edit(role)}>Edit</Button></Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```
