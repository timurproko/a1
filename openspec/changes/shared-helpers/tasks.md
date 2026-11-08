# Tasks

## 1. Terminal forwarding

- [x] 1.1 Add one forwarding helper to `tui-runtime/adapter.ts` (a new module would grow the pinned startup graph) and rewrite `coordinatedInputTerminal`, `diagnosticTerminal`, `frozenGateTerminal` and `preInputTerminal` to state only their overrides.

## 2. Release containment

- [x] 2.1 Add `src/foundation/release/managed-path.ts` (`samePath`, `isDirectChild`, `errorMessage`) with a unit test of accepted and rejected paths, and replace the copies in `automatic-update.ts`, `update-execution-lease.ts`, `update-recovery.ts`, `update.ts`, `dependency-layer.ts`, `release-gc.ts`, `restart-certification.ts`, `latest-release.ts` and `update-activation.ts`.

## 3. Script helpers

- [x] 3.1 Add `scripts/cli-options.mjs` (`optionValue`) and `scripts/canonical-digest.mjs` (`canonicalJson`, `canonicalDigest`) with a unit test, and replace the `valueAfter`, `argumentValue`, `canonical` and `digest` copies.

## 4. Test helpers

- [ ] 4.1 Replace the local `deferred` helpers with `Promise.withResolvers`, and remove the temporary folders that `session-selector`, `code-documentation`, `code-documentation-command` and `validation-impact` tests leave behind.
