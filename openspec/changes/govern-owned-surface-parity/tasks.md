## 1. Declare the owned surfaces

- [ ] 1.1 Add the declared A1-owned surface list — id, owning app, route, and for a replacement the
  pinned route it supersedes — and export it from the owned UI so both the shell and the gate read one
  source
- [ ] 1.2 Resolve a slash route against the declaration in the session shell before the pinned
  workflow table; verify a declared route opens its app and every other route stays pinned

## 2. Make the gate read the declaration

- [ ] 2.1 Make `scripts/run-pi-terminal-parity.mjs` classify checkpoints from the declaration, with no
  hardcoded exclusion list, so the seven `/settings` checkpoints read as superseded; verify the
  classification set is derived from the exported declaration
- [ ] 2.2 Assert a replacement drops nothing: every setting the engine reports is reachable from the
  settings screen, failing when a reported setting is missing

## 3. Prove it fails when it should

- [ ] 3.1 Add fast-tier tests for the three parity failure scenarios: an undeclared divergent surface,
  an addition that displaces a pinned surface, and a replacement that drops a superseded capability
- [ ] 3.2 Confirm `a1 pi` is untouched: verify the declaration applies only to the owned UI path and no
  vanilla launch path consults it

## 4. Validate and integrate

- [ ] 4.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 4.2 Open the pull request and let CI validate
- [ ] 4.3 Record manual acceptance, then archive
