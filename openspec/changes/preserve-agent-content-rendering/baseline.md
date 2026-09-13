# Implementation baseline (not candidate acceptance)

## Artifact and environment

- Specification PR #348 is merged, with required CI successful.
- Probe source: `2521d86b1ca3420d9f6a839689159c06cb69c5b9`, detached implementation worktree `D:/Git/a1/.worktrees/preserve-agent-content-rendering-impl`. Only baseline tests and task progress differed when the probe ran; production source was unchanged.
- Standalone protocol fixture: `scripts/pi/reproduce-ghost-link-underlines`. This is not an A1/Pi session or a rebuilt application candidate.
- Windows Terminal: running process path identifies package `Microsoft.WindowsTerminal_1.24.11911.0_x64__8wekyb3d8bbwe`; process product version `1.24.260710001`. Queried read-only with `Get-Process WindowsTerminal` and `Get-AppxPackage`.
- Geometry recorded by all three traces: 171 columns by 40 rows, Git Bash shell. URL auto-detection is operational by user observation; the precise profile setting was not independently inspected or changed. Trace CLI metadata initially said `unknown` for version and URL detection; the observations above supplement, not rewrite, those original records.
- Exact artifact, content category, and terminal environment of the original disappearing-content screenshots remain unidentified. The current protocol reproduction is a separately identified baseline, not proof that those screenshots came from this build.

## Physical observations reported by the user

1. Cyan explicit links work well, except the two-line link highlights only the row under the pointer, not both rows together. This is a hover-grouping observation, not evidence that this fixture truncates the activation target: it supplies the full target to each row but opens a separate anonymous OSC 8 span on each row.
2. Plain-text, terminal-auto-detected links leave ghost underlines during scrolling with `CLEAR:OFF`.
3. With `CLEAR:ON`, auto-detected links scroll without the ghost underlines.

The plain tool-text rows intentionally have no OSC 8 in either fixture mode. Their ghosting is therefore not evidence that all cyan explicit links fail. The user supplied the visual verdicts in conversation, not with `y`/`n` markers; none of the inspected traces contains a `human-observation` event. Do not attribute a verdict to an individual frame without additional evidence.

## Local raw-write context

Raw synthetic traces remain local under `.artifacts/ghost-link-baseline/`; no private conversation, screenshot, host session identifier, or megabyte trace is committed here. Counts at inspection:

| Run | Frames | Terminal writes | Direct full-clear frames | Context |
| --- | ---: | ---: | ---: | --- |
| `run-a6V17H` | 517 | 518 | 1 | Explicit mode; one `f` comparison; scrolling and blank replacement |
| `run-iyACFo` | 432 | 433 | 0 | Explicit and auto-detected modes; scrolling and blank replacement |
| `run-trCleK` | 146 | 147 | 136 | Persistent clear toggles; finishes in auto-detected mode with clears on |

The ordinary probe path requests complete row frames with line erasure and a screen clear. The damage adapter may suppress the screen clear and reconcile explicit hyperlink damage. `CLEAR:ON` instead forwards the original full-clear write directly and restarts adapter cache ownership. This comparison changes both the screen-clear sequence and adapter bypass; it demonstrates a successful broad-clear control, not the minimum safe repair or proof that line rewriting resolves native hover state.

## Automated content and target baseline

Focused run: `PI_OFFLINE=1 npx vitest run test/integrations/pi/session-ui/transcript-content-retention.test.ts --reporter=json --outputFile=.artifacts/rendering/content-retention-baseline.json`.

Result before production changes: **7 failed, 1 passed**. The intentionally failing baseline assertions are:

- Execution output following assistant argument completion is rejected.
- Run-local completion temporarily removes earlier history before settlement.
- Repeated call declarations downgrade a completed result.
- Structured result details do not reach the actual registered renderer.
- Renderer invalidation does not reach the real presentation scheduler.
- An image arriving after an existing call header has a retained asset reference but no visible presentation.
- A wrapped bare tool-output URL has a truncated target/unlinked continuation.

Wrapped explicit file targets pass. Production ordering is referenced in `test/support/rendering/transcript-lifecycle-fixture.ts`; this deliberately completes assistant arguments before execution. The attachment failure is its measured baseline, not an assumed failure.

## Remaining evidence and acceptance

- The standalone probe cannot reproduce disappearing assistant/thinking content, live tool output, or edit diffs: these physical cases remain untested. Deterministic evidence already locates independent engine and presentation failures; per the design's open questions, identifying the original content category does not gate those confirmed repairs.
- The current two-line hover result does not invalidate the separate automated production defect in target construction after wrapping.
- No claim is made yet about physical correctness under bounded alternative overwrites, 192-by-54 geometry, selection, modal coverage, resize, image rendering, or the exact eventual candidate.
- Full-screen clearing remains a diagnostic control, not an accepted normal-rendering workaround. Native activation and terminal settings remain unchanged.
- Tasks 7.3 and 7.4 remain the user-controlled content/link acceptance gates. No production remediation or candidate acceptance is established by this baseline.

## Subsequent implementation checkpoint: execution state and continuity

Tasks 2.1–2.5 introduce explicit owned tool execution state, phase/revision guards shared with the shell, pinned abort/error mapping, run-local merging, and fresh component mounts for actual session rebinding. Repeated declarations and duplicate starts retain accumulated results and arguments. Session replacement cannot inherit a reused invocation's old arguments or rendered result. Delivery recovery still preserves its separate same-session ownership policy.

Focused validation of this checkpoint:

- Owned lifecycle contracts, engine adapter, pending delivery, independent pinned component parity, and the growing retention suite: **56 passed, 4 failed**. The four failures are the deliberately retained, not-yet-repaired baseline assertions for structured details, asynchronous renderer invalidation, late image presentation, and wrapped bare-URL targets. This is not an overall passing validation result.
- Existing session-shell tests: **189 passed**, including modal/selection, scheduling, viewport, and session replacement cases.
- Typechecking and strict OpenSpec validation passed. No `test:fast`, `test:full`, or `test:release` tier was run.
- No implementation CI or acceptance is claimed. The implementation is incomplete and must not be merged.

## Opt-in native-hover experiment (physical result pending)

The standalone probe additionally accepts `--group-wrapped --row-erase ech`:

- `--group-wrapped` gives all fragments of a wrapped occurrence the same OSC 8 `id`, while keeping distinct wrapped occurrences separate. Labels, colors, and full targets are unchanged. This is an experiment for the reported one-row-only hover, not a production URL-path repair.
- `--row-erase ech` uses explicit-width Erase Character writes instead of Erase Line. With `CLEAR:OFF`, neither its requested nor forwarded frames contain a display-clear command. The existing finite-grammar adapter forwards the unrecognized variant fail-closed; its production grammar and cleanup policy are unchanged.
- `p`/`f` remain explicitly labelled full-clear controls. A positive result with either control is not an ECH success.
- This fixture still requests complete row frames. Even if its hover review passes, production adoption would require bounding erasure to affected rows and preserving existing scheduling/paint budgets. No such adoption is included in this checkpoint.
- The fixture tests pass **13/13**, covering default controls, stable wrapped IDs, unchanged styling/labels/targets, absence of hidden display clears in forwarded ECH frames, and final text/cursor replay with synchronization honored and ignored. Native hover is outside that replay's model.

Next physical check: keep `CLEAR:OFF`; hover both segments of the explicit long URL and report whether they highlight together. Then press `2`, hover the plain auto-detected link and scroll with a stationary pointer; record `y` if ghosts remain or `n` if clean, then quit with `q`. The outcome is pending and no bounded native cleanup has been selected yet.
