## 1. Preserve and Reproduce the Failure

- [ ] 1.1 Record release run `33617331350`, exact package `0.1.8-dev.209`, failed jobs, six assertion locations, and representative truecolor-versus-256-color SGR pairs; verify the retained diagnosis distinguishes successful build/pack from failed exact-package validation.
- [ ] 1.2 Reproduce the color-depth divergence with the smallest applicable parity command under a capability state with `trueColor: false`, then verify the same workload passes when both producers initialize under declared truecolor without changing fixture bytes.

## 2. Add a Bounded Capability Scope

- [ ] 2.1 Add a test-support helper using public Pi-TUI `getCapabilities()` and `setCapabilities()` that installs a complete copied capability state for one sync or async callback and restores the exact prior state in `finally`; verify no production module imports the helper.
- [ ] 2.2 Add focused tests for synchronous return/throw, asynchronous resolution/rejection, nested LIFO restoration, sequential captures, and preservation of every non-color capability field.
- [ ] 2.3 Verify the helper imports the repository's pinned public Pi-TUI identity and that existing module-identity governance still rejects a second or private package path.

## 3. Make Parity Producers Deterministic

- [ ] 3.1 Scope pinned and owned settings-row construction to declared truecolor before either theme initializes; verify all three widths and the retained-row boundary match byte-for-byte on Node 22 and Node 24 semantics.
- [ ] 3.2 Scope complete static component case construction through disposal; verify every stored row, SGR parameter, reset, width, and coverage entry remains unchanged.
- [ ] 3.3 Scope the full asynchronous scripted event-frame capture through shell and adapter disposal; verify all states and normalized terminal frames remain unchanged and capability state is restored after success or producer failure.
- [ ] 3.4 Keep existing strict semantic-ANSI normalization boundaries and fixture provenance unchanged; verify the implementation adds no broad ANSI stripping, 256-to-RGB approximation, environment-dependent fixture regeneration, or reduced parity assertion.
- [ ] 3.5 Verify the implementation changes only test support/tests and does not modify production theme detection, runtime terminal capabilities, package dependencies, pinned or installed Pi sources, generated package contents, or user-visible colors.

## 4. Validate and Deliver

- [ ] 4.1 Run focused helper, settings parity, static parity, event-frame parity, module-identity, typecheck, architecture, and strict OpenSpec checks; verify all pass without locally running full/release suites.
- [ ] 4.2 Push a fresh implementation branch and open a code pull request citing this change with auto-merge disabled; verify required current-head CI passes and the pull request contains no unrelated primary-worktree `bin/pi-tui.d.ts` change.
- [ ] 4.3 Provide the exact candidate commit and focused parity command for maintainer review; after explicit acceptance and manual merge, dispatch a fresh develop publication and verify one newly numbered exact package passes every configured Node 22/24 platform job before publication.
- [ ] 4.4 Record the correction PR, CI, exact package, cross-platform release result, maintainer acceptance, and merge identity in `acceptance.md`, then synchronize/archive this skip-spec change in an OpenSpec-only follow-up.
