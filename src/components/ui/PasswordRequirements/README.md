# PasswordRequirements

## Purpose
Live checklist of Cognito's password policy rules, updating as the user types. Rules come from
`@heediq/shared`'s `PASSWORD_POLICY_RULES` (not hardcoded here) so the frontend can't silently drift
from the backend's rule set — see that package's `passwordPolicy.ts` for the single source of truth,
and `claude-workspace/rules/10-consistency-check.md` for how it's kept in sync with the Cognito User
Pool config in `heediq-infra` (which isn't wired to the same import — see D-020).

## Props
- `password: string` — the current value of the password field being evaluated.

## States
Static composed-list, no interactive states of its own — each rule row is `success` (met, check
icon) or neutral/unmet (cross icon, muted text). `role="status"` so screen readers hear rule changes
as the user types, mirroring a live-region pattern rather than a one-off `aria-live` div.

## Usage
```tsx
<Input label={t('auth.verify.newPasswordLabel')} value={newPassword} onChange={...} />
<PasswordRequirements password={newPassword} />
```
