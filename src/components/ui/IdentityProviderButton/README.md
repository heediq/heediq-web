# IdentityProviderButton

## Purpose
Direct-to-provider sign-in button (D-118) — one button per federated identity provider (Google,
Microsoft), each rendering that provider's own official brand mark, instead of a single generic
"Continue with SSO" button that lands on Cognito's Hosted-UI IdP picker. Button chrome stays in the
kit's neutral secondary style (dark surface, bordered) — only the mark itself carries the provider's
brand colors, matching how Linear/Vercel-style apps render these buttons.

## Props / variants
- `provider`: `'Google'` · `'Microsoft'` — selects the brand mark and the i18n label
  (`home.continueWithGoogle` / `home.continueWithMicrosoft`)
- `loading`: boolean — shows `Spinner` in place of the mark, sets `aria-busy`, disables the control
- Otherwise accepts standard `<button>` attributes (e.g. `onClick`)

## States
default · hover · active/pressed · focus-visible (accent ring) · disabled · loading — per
`03-ui-kit.md` §4.

## Usage
```tsx
<IdentityProviderButton provider="Google" onClick={() => login('Google')} />
<IdentityProviderButton provider="Microsoft" onClick={() => login('Microsoft')} loading={isPending} />
```

## Gotchas & Constraints
- The Google/Microsoft marks are the standard public brand SVGs (inline, no external asset fetch) —
  don't recolor them to fit the amber/charcoal token set; that would misrepresent the provider brand.
- Each instance calls `login(provider)` (`src/lib/auth/AuthContext.tsx`), which adds
  `identity_provider=<Google|Microsoft>` to the Cognito Hosted-UI authorize URL so the user never
  sees Cognito's own IdP picker — see `src/lib/auth/README.md`.
