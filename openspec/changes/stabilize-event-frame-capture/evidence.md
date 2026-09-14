# Event-frame capture implementation evidence

## Baseline and authorization

- Legacy accepted plan: [#379](https://github.com/timurproko/a1/pull/379); approved reconciliation: [#391](https://github.com/timurproko/a1/pull/391), merged as `43991071` with required CI passing.
- The maintainer explicitly requested implementation with "lets fullfill" after the four remaining obligations were explained. This is implementation authorization, not final acceptance or merge authorization.
- Isolated worktree: `D:/Git/a1/.worktrees/fulfill-event-frame-capture`, refreshed from `origin/develop` through `43991071`. The initial existing parity file passed all 10 tests before changes.
- Original failure: [#373 run 34848254433](https://github.com/timurproko/a1/actions/runs/34848254433/job/103989846402). #374 already repaired ordinary capture timing; selection acceptance and archival are not reopened here.

## Failing-before evidence

The added unrelated-context regression failed on the unchanged #374 fixture: code outside a suspended capture observed `Date.now() === 1700000000000` rather than current native time. This was an assertion failure, not a timeout. The local output is retained in `.artifacts/event-capture-before.log`.

A bounded mutation removed only the new clock's transaction hold. The real pinned-layout shell and adapter then reproduced the historical completed-stage divergence on the first before-flush schedule:

```text
phase=before-flush repetition=0 ambient=truecolor
frames[3] stage=completed serialized offset=67
expected capturedAnsi prefix: \u001b[3A\r\u001b[2K\u001b[38;2;129;162;190m...
actual capturedAnsi:          \u001b[1G\u001b[?25l
```

The callback is the TUI's timeout scheduled through `requestRender` / next-tick `scheduleRender`. Making it eligible before cooperative event delivery finishes can replace the retained completed redraw with cursor housekeeping. The exact divergence matches #374's recorded historical evidence, independently of the custom selection viewport. This is a controlled reproduction of vulnerable timing behavior, not a claim that unmodified #374 still fails ordinary captures.

The mutation is restored. A permanent negative regression uses a test-only `UnheldClock` subclass to exercise the same real callback ordering and asserts both the exact cursor-only result and unchanged semantic states. No expected rows or ANSI writes are injected to manufacture that mismatch. Local mutation output is retained in `.artifacts/event-capture-unheld.log`.

## Implementation

- Replace the process-global mock clock with an AsyncLocalStorage-owned test clock. Native Date/timeouts/intervals remain live in unrelated async contexts; exact global function identities return on exit. Only owned timers are cancelled. Overlapping captures are rejected before altering the active scope; closed clocks cannot be reused.
- Hold timeout paints across each event/resize transaction. Explicit component-render observation tracks the public root's rendered revision and geometry, replacing the `writes.length` completion heuristic. The probe is instance-only; no private/prototype patch or installed-package edit is made.
- Bound cooperative settlement, including test hooks and disposal, to 64 host event-loop turns, with stage, pending timer count, and bounded adapter diagnostics on exhaustion. Bound each eligible timeout callback batch to 64. Animation time remains fixed; periodic animation is not drained to idle.
- Retain all original-order event-window writes. Prior maintenance is excluded only at the declared boundary, not by inspecting or filtering ANSI content. Keep existing normalization and provenance unchanged.
- Add six controlled timer schedules around flushing, capture, and resize, each with 12 repetitions in each ambient color mode. Retain normal/delayed repetitions and negative semantic/SGR/cursor/clear comparisons.
- Exercise stalled hooks/checkpoints, callback exhaustion, timer handle cancellation, overlapping ownership, terminal-stop disposal failure, subsequent captures, and native timers created before and during a capture.

## Local validation

- Focused event-frame and clock tests: 29 passed on Windows Node 24.16.0 and 29 passed on Node 22.23.2 under existing test timeouts.
- Related capability scope and parity-governance tests: 10 passed on Node 24.
- Typecheck, changed-file documentation governance, strict OpenSpec validation, and diff checks passed.
- The standalone generator was run inside both `truecolor` and `256color` ambient capability scopes. Both outputs exactly match the tracked original with SHA-256 `f1e0fd6f1e3512c2512b9f41771b47b660d050c47bab4573099632e3eda34bba`; no fixture baseline changed.
- No production source, installed dependency, package metadata, CI workflow, timeout, or comparison normalization change is included. No prohibited local broad suite was run.

## Remaining gates

Required CI for the final implementation head, maintainer exact-candidate acceptance, and explicit manual merge authorization remain outstanding. Code auto-merge must remain disabled. Only after accepted integration may this change's own evidence recording and archive preparation proceed.
