## Reconciliation baseline

PR #374 supplies the clock-based repair and evidence described in `design.md`; credit below is historical evidence, not a fresh test run or this change's acceptance. At `5a416891`, the relevant fixture, test, diagnostic helper, and generator are unchanged from that merge. Incomplete mixed tasks remain incomplete. PR #373 already passed required validation, merged, and was archived through #384; no selection revalidation is requested here.

## 1. Establish the independent timing regression

- [x] 1.1 After the explicit implementation request, fetch current `origin/develop` and establish an isolated legacy implementation stream; verify accepted #379 artifacts and approved revisions are present and its draft PR retains version-1 linkage to #379 plus the historical failing-job reference.
- [x] 1.2 Use preserved pre-#374 divergence evidence to identify and reproduce the responsible callback and stage-boundary ordering with bounded controls; verify the vulnerable behavior fails independently of selection and distinguish this historical reproduction from current-baseline gap regressions.
- [x] 1.3 Encode the identified interleavings as a focused failing regression without long sleeps, unbounded busy loops, retries, or timeout increases; verify the baseline fails for the observed capture difference rather than an unrelated timeout.

## 2. Make fixture capture deterministic

- [x] 2.1 Implement fixture-owned timing and explicit event-settlement/render boundaries for initial, streaming, tool-result, completed, and resized captures using existing supported controls; verify real shell writes, state transitions, and geometry agree at each retained stage without production or installed-package edits.
- [x] 2.2 Bound settlement and restore fixture-owned timing, pending work, shell/adapter lifecycle, and capability state on success and failure; verify sequential captures, injected failures, and bound exhaustion leave no callbacks or global state leaking into later tests.
- [x] 2.3 Retain strict normalized ANSI and write ordering and add bounded stage/first-difference diagnostics; verify deliberate semantic, SGR, and cursor/clear differences still fail comparison and no new normalization hides extra paints. Delivered by #374's `eventFrameDifference` and negative tests, with passing evidence in the [merged #374 record](https://github.com/timurproko/a1/blob/43a9598279d13336fee8cb61fd81ec62bcb915bd/openspec/changes/fix-nightly-platform-validation/evidence.md); retain and rerun these checks for the new candidate under 3.1.
- [x] 2.4 Keep the standalone event-frame generator on the same capture policy; verify repeat generation is idempotent under opposing ambient capabilities and preserves diagnostic provenance and existing payloads. #374 recorded identical original/truecolor/256-color SHA-256 `f1e0fd6f1e3512c2512b9f41771b47b660d050c47bab4573099632e3eda34bba`; repeat verification after further capture changes under 3.1, with review required before any baseline correction.

## 3. Validate and hand off

- [x] 3.1 Run focused parity and timing-scope regressions with the existing 12 repetitions in both ambient color modes under ordinary and controlled adversarial schedules; verify one identical structured result/hash, strict negative comparisons, preserved semantic assertions, and bounded runtime under the existing timeout. Rerun generator idempotence under both ambient modes and compare against the tracked payload; explain and obtain review before any baseline change.
- [x] 3.2 Run strict OpenSpec and changed-file documentation validation and obtain required CI for the exact implementation candidate; verify all required checks pass without changing CI scope, weakening assertions, or running prohibited local broad suites.
- [ ] 3.3 Hand off the exact worktree, branch/commit, focused test and generator commands, retained reproduction evidence, and known gaps; record maintainer acceptance and explicit merge authorization before integrating the code PR, with auto-merge disabled.

## 4. Archive preparation

- [x] 4.1 Record verified implementation acceptance and merge evidence for archive preparation.
- [x] 4.2 Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.

These two exact mechanical tasks replace the archive-preparation portion of former mixed task 3.4; they do not waive 3.2 or 3.3. There are no delta specs (`skip_specs: true`). Only after the archive follow-up integrates, verify PR merge states and staged, unstaged, and untracked changes before removing this stream's retained worktrees and pruning. Selection integration from former 3.4 is already recorded above, not attributed to this tooling candidate.

## Final disposition

The maintainer accepted exact head `0c86e93f` after merge and explicitly requested archival. Required CI run `34863497877` passed on that head. See `acceptance.md` and its PR comment provenance. Task 3.3 remains unchecked only because its original requirement to record acceptance/authorization before integration cannot be satisfied retroactively; the handoff and subsequent explicit acceptance are recorded, with no reopened implementation finding. This manual archive preserves that process-timing exception rather than falsely ticking the original task.
