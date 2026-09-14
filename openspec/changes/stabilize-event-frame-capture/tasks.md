## 1. Establish the independent timing regression

- [ ] 1.1 After planning merge and a new explicit implementation request, create a fresh detached worktree from current `origin/develop`; verify the accepted artifacts are present and the implementation PR cites this plan and PR #373's failing job.
- [ ] 1.2 Reproduce the hash variation on the fresh baseline with bounded timing pressure and identify the responsible scheduled callback and stage-boundary ordering; retain escaped first-difference evidence and verify whether the failure occurs without the selection changes.
- [ ] 1.3 Encode the identified interleavings as a focused failing regression without long sleeps, unbounded busy loops, retries, or timeout increases; verify the baseline fails for the observed capture difference rather than an unrelated timeout.

## 2. Make fixture capture deterministic

- [ ] 2.1 Implement fixture-owned timing and explicit event-settlement/render boundaries for initial, streaming, tool-result, completed, and resized captures using existing supported controls; verify real shell writes, state transitions, and geometry agree at each retained stage without production or installed-package edits.
- [ ] 2.2 Bound settlement and restore fixture-owned timing, pending work, shell/adapter lifecycle, and capability state on success and failure; verify sequential captures, injected failures, and bound exhaustion leave no callbacks or global state leaking into later tests.
- [ ] 2.3 Retain strict normalized ANSI and write ordering and add bounded stage/first-byte mismatch diagnostics; verify deliberate semantic, SGR, and cursor/clear differences still fail comparison and no new normalization hides extra paints.
- [ ] 2.4 Keep the standalone event-frame generator on the same capture policy; verify repeat generation is idempotent under opposing ambient capabilities and preserves diagnostic provenance and existing payloads, or obtain review of an explained boundary correction before changing stored output.

## 3. Validate and hand off

- [ ] 3.1 Run focused parity and timing-scope regressions with the existing 12 repetitions in both ambient color modes under ordinary and perturbed schedules; verify one identical structured result/hash, preserved semantic assertions, and bounded runtime under the existing timeout.
- [ ] 3.2 Run strict OpenSpec and changed-file documentation validation and obtain required CI for the exact implementation candidate; verify all required checks pass without changing CI scope, weakening assertions, or running prohibited local broad suites.
- [ ] 3.3 Hand off the exact worktree, branch/commit, focused test and generator commands, retained reproduction evidence, and known gaps; record maintainer acceptance and explicit merge authorization before integrating the code PR, with auto-merge disabled.
- [ ] 3.4 After authorized integration, coordinate fresh required validation for PR #373's actual candidate without treating this tooling fix as selection acceptance; record this change's acceptance and archive it in an OpenSpec-only follow-up, verifying merge state and clean task worktrees before cleanup.
