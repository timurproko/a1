## 1. Make the command mean it

- [x] 1.1 Route the `pi` profile to the owned runtime with A1's own surfaces withheld,
- [x] 1.2 Update the runtime selection tests to the new contract

## 2. Point the measurement at it

- [x] 2.1 Launch `a1 pi` from the parity run rather than setting an environment
  variable, and drop the variable

## 3. Validate and integrate

- [x] 3.1 Required type, architecture, and test validation passed for the integrated implementation
- [x] 3.2 Retire the automatic checkpoint run through `unify-launch-and-retire-automatic-parity`; parity now uses reader comparison
- [x] 3.3 The implementation integrated with successful required validation
- [ ] 3.4 Record manual acceptance — `a1 pi` beside vanilla `pi` — then archive
