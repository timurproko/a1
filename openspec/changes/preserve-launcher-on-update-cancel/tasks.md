## 1. Incident Baseline and Recovery Contract

- [ ] 1.1 Reproduce the cancelled global replacement against isolated Windows npm/data/runtime roots, capture the package and three-launcher mutation sequence plus durable journal state, and verify the fixture fails because no canonical launcher remains
- [ ] 1.2 Define additive recovery-capsule, guardian-result, cancellation-request, and launcher-disposition records bound to one update transaction, and verify parsers reject malformed identities, unknown phases, stale process identity, and paths outside managed roots
- [ ] 1.3 Define platform launcher descriptors for Windows shell/command/PowerShell files and the Unix executable, and verify canonical-path and complete-set checks reject missing, linked, non-executable, mixed-target, and escaping launchers

## 2. Transaction-Scoped Recovery Capsule

- [ ] 2.1 Package a dependency-light recovery entry and atomically commit its transaction-scoped payload and digest before npm mutation; verify an interrupted capsule write cannot become executable authority
- [ ] 2.2 Implement strict capsule loading that binds transaction, npm roots, package identity, prior release, target, launcher set, and payload digest; verify every bound-field mutation fails closed
- [ ] 2.3 Implement recovery launchers that invoke only the capsule entry, route ordinary launch arguments to the prior verified immutable release, and route self-update arguments to the exact recorded transaction; verify no second public command or arbitrary target is accepted
- [ ] 2.4 Protect a capsule while any canonical launcher references it and integrate bounded cleanup after terminal transaction disposition; verify active recovery is retained and obsolete capsules are collected

## 3. Detached Package-Replacement Guardian

- [ ] 3.1 Start one detached guardian with native PID/start identity before package replacement and durably transfer ownership of npm execution; verify loss of the invoking updater does not terminate or duplicate the guardian
- [ ] 3.2 Make the guardian execute npm with fixed arguments, preserve relevant diagnostics, and record exact exit/package outcomes; verify successful, nonzero, spawn-failure, timeout, and unexpected-exit cases
- [ ] 3.3 Implement durable idempotent Ctrl+C/SIGTERM cancellation requests, bounded npm termination, and one focused cancellation diagnostic; verify repeated interrupts cannot kill the guardian or start competing recovery
- [ ] 3.4 Implement the final launcher postcondition: retain complete verified target launchers after success or atomically install the complete recovery launcher set after incomplete replacement; verify no terminal result is published before the postcondition passes
- [ ] 3.5 Serialize guardian, updater, and later-invocation recovery with transaction and process identity; verify stale workers, concurrent invocations, and reused PIDs converge to one owner and one launcher disposition

## 4. Self-Update Integration and Compatibility

- [ ] 4.1 Route stable and development global replacement through the guardian while preserving target resolution, ownership handling, progress, and activation phases; verify ordinary successful update transcripts and phase ordering remain compatible
- [ ] 4.2 Honor cancellation immediately before the destructive interval and coordinate it during the interval, leaving package-installed targets resumable without premature activation; verify each boundary records the expected transaction phase and exit status
- [ ] 4.3 Teach mutable and recovery launch paths to consume incomplete launcher dispositions and converge to the prior verified cohort or completed target without manual npm installation; verify existing version-one journals remain readable and safely recoverable
- [ ] 4.4 Preserve live immutable sessions, rollback references, warmup, supervisor verification, and update diagnostics through cancellation and recovery; verify no recovery path deletes user state or mixes release content

## 5. Physical Cancellation and Fault Gates

- [ ] 5.1 Add deterministic unit and integration faults for capsule commit, guardian ownership, npm exit, cancellation races, launcher verification, recovery invocation, and cleanup; verify every fault reaches one documented safe disposition
- [ ] 5.2 Add an isolated Windows exact-package matrix that interrupts before and after each observed mutation of `a1`, `a1.cmd`, and `a1.ps1`; verify all three are callable before cancellation acknowledgement and resolve through one verified disposition
- [ ] 5.3 Add Linux and macOS exact-package interruption cases around executable-launcher replacement and updater loss; verify executable mode, canonical target, and subsequent transaction convergence
- [ ] 5.4 Terminate the invoking updater while the detached guardian owns npm on each supported platform; verify the guardian survives, establishes the launcher postcondition, and a subsequent `a1` invocation requires no manual repair
- [ ] 5.5 Inject malformed recovery evidence and path escapes at the physical boundary; verify no changed payload executes and no file outside the canonical npm bin root is overwritten

## 6. Validation and Acceptance

- [ ] 6.1 Run strict OpenSpec, typecheck, architecture, changed-file documentation, focused update/release/process tests, and exact-package cancellation gates in required CI; verify current-head checks pass without retries
- [ ] 6.2 Provide a packaged manual test that cancels during the npm replacement interval and verify the maintainer confirms the shell returns with `a1 --version` callable, existing sessions intact, and a rerun converging without manual installation
- [ ] 6.3 Record accepted Windows and Unix fault evidence, launcher identities, transaction dispositions, and manual results; complete or deliberately skip every task and archive only after the implementation is accepted and merged
