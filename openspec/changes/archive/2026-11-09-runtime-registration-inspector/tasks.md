# Tasks

## 1. Production inspector default at composition

- [x] 1.1 Add a failing composition test that calls `composeOwnedUi()` with `bin/ui.js`'s option shape and no `inspectProcess`, captures the primary `repositoryContextReader` through the engine-host seam, and expects a runtime record published in an isolated temporary product store.
- [x] 1.2 Default `inspectProcess` to `inspectLiveProcess` in `composeOwnedUi()`, preserving an explicitly supplied inspector; leave `SessionRuntimeRegistry` guards unchanged.
- [x] 1.3 Cover injection precedence (deterministic inspector used instead of the default) and comparison isolation (no reader, no activation, registration, release, or written state).

## 2. Registration lifecycle coverage

- [x] 2.1 Assert the published record's runtime ID, primary agent, session ID/file, and `process.pid`/`pid-liveness` identity agree; dispose releases only that runtime's claims and leaves an unrelated runtime's record intact.
- [x] 2.2 Extend registry tests so a first inspection returning `null` still records the identity and arms the retry, and a later valid attempt registers (fake timers); confirm session switch and disposal do not republish old identities.
- [x] 2.3 Assert successful registration alone does not take over a worktree claimed by another live or unverifiable runtime.

## 3. Pre-ready integration checks

- [x] 3.1 Run typecheck, only the changed composition/registry test files, and strict validation of this change; reconcile failures without weakening assertions and disposition known gaps in the design.
- [x] 3.2 Reconcile and push current `origin/develop`, add plain PR Acceptance outcomes, and pass the delivery-body final check before checking the final Implementation item.

## Workflow follow-up

- This planning-only draft requires explicit plan approval and an implementation request before code or test edits.
- Live-shell acceptance of an installed fixed build is optional maintainer validation and does not block implementation checkboxes; publishing or installing a release is a separate maintainer decision.
- Integration remains an explicit authorized maintainer decision for the current eligible candidate.
