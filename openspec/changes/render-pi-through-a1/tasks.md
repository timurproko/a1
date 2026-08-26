## 1. Make the command mean it

- [x] 1.1 Route the `pi` profile to the owned runtime with A1's own surfaces withheld,
- [x] 1.2 Update the runtime selection tests to the new contract

## 2. Point the measurement at it

- [x] 2.1 Launch `a1 pi` from the parity run rather than setting an environment
  variable, and drop the variable

## 3. Validate and integrate

- [ ] 3.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 3.2 Run parity once against the command and confirm every checkpoint matches
- [ ] 3.3 Open the pull request and let CI validate
- [ ] 3.4 Record manual acceptance — `a1 pi` beside vanilla `pi` — then archive
