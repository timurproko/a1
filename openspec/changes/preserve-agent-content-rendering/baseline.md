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
- At this initial baseline, tasks 7.3 and 7.4 were combined content/link acceptance gates. The subsequently approved PR #355 separates link follow-up into #353; content correctness and stability still require exact-candidate user acceptance. This baseline itself establishes neither production remediation nor candidate acceptance.

## Subsequent implementation checkpoint: execution state and continuity

Tasks 2.1–2.5 introduce explicit owned tool execution state, phase/revision guards shared with the shell, pinned abort/error mapping, run-local merging, and fresh component mounts for actual session rebinding. Repeated declarations and duplicate starts retain accumulated results and arguments. Session replacement cannot inherit a reused invocation's old arguments or rendered result. Delivery recovery still preserves its separate same-session ownership policy.

Focused validation of this checkpoint:

- Owned lifecycle contracts, engine adapter, pending delivery, independent pinned component parity, and the growing retention suite: **56 passed, 4 failed**. The four failures are the deliberately retained, not-yet-repaired baseline assertions for structured details, asynchronous renderer invalidation, late image presentation, and wrapped bare-URL targets. This is not an overall passing validation result.
- Existing session-shell tests: **189 passed**, including modal/selection, scheduling, viewport, and session replacement cases.
- Typechecking and strict OpenSpec validation passed. No `test:fast`, `test:full`, or `test:release` tier was run.
- No implementation CI or acceptance is claimed. The implementation is incomplete and must not be merged.

## Opt-in native-hover experiment: grouping passed, ECH failed

At historical checkpoint `7379f3a1`, the standalone probe additionally accepted `--group-wrapped --row-erase ech`. These opt-in probe changes are excluded from the later content-only implementation diff; the source checkpoint and local traces retain the experiment for #353:

- `--group-wrapped` gives all fragments of a wrapped occurrence the same OSC 8 `id`, while keeping distinct wrapped occurrences separate. Labels, colors, and full targets are unchanged. This is an experiment for the reported one-row-only hover, not a production URL-path repair.
- `--row-erase ech` uses explicit-width Erase Character writes instead of Erase Line. With `CLEAR:OFF`, neither its requested nor forwarded frames contain a display-clear command. The existing finite-grammar adapter forwards the unrecognized variant fail-closed; its production grammar and cleanup policy are unchanged.
- `p`/`f` remain explicitly labelled full-clear controls. A positive result with either control is not an ECH success.
- This fixture still requests complete row frames. Even if its hover review passes, production adoption would require bounding erasure to affected rows and preserving existing scheduling/paint budgets. No such adoption is included in this checkpoint.
- The fixture tests pass **13/13**, covering default controls, stable wrapped IDs, unchanged styling/labels/targets, absence of hidden display clears in forwarded ECH frames, and final text/cursor replay with synchronization honored and ignored. Native hover is outside that replay's model.

### User-controlled result at `7379f3a1`

The user answered **yes** to both questions: both explicit wrapped rows now highlight together, and auto-detected links still leave ghost underlines on scroll. Thus shared native occurrence IDs passed this probe's hover-grouping check; ECH failed the ghost-cleanup check. Neither result establishes production acceptance or repairs the production post-wrap target-construction defect.

Local trace `run-SMYqwq/trace.jsonl` identifies clean commit `7379f3a1c95d312d4ed1ca46517fe49c8b012693`, `groupWrappedLinks: true`, `rowErase: ech`, and 171-by-40 geometry. At inspection it contains 41 frames (17 explicit, 24 auto-detected), 42 terminal writes, 41 ECH-bearing writes, and **zero display-clear commands**. All 41 decisions report `pending-hyperlink-cleanup`, rather than a recognized optimized cleanup. There are no `human-observation` markers, so the visual verdict comes from the user's conversation report, not automated interpretation of the trace. Its version/settings CLI metadata says `unknown`; retain the independently queried running-host facts above rather than rewriting it.

### Source-backed host diagnosis

Inspected Microsoft Windows Terminal release tag `v1.24.11911.0`, resolved to commit `5a830b2bf7c053d5c7ac22208fe5a346cb5dd3dc`. Public source copies are local under `.artifacts/terminal-host-source/1.24.11911.0/`; no installed terminal or dependency was modified.

- `src/cascadia/TerminalControl/ControlCore.cpp:188–214,2176–2197`: output schedules a trailing, debounced 100 ms idle callback. On this ordinary output path, that callback recomputes the visible URL-pattern tree. Continuous application repainting can keep postponing it.
- `src/terminal/adapter/adaptDispatch.cpp:739–851`: ECH and EL both erase via `_FillRect`; neither invalidates the terminal's URL-pattern tree. Changing between them therefore does not address that cache lifetime.
- `src/terminal/adapter/adaptDispatch.cpp:3167–3215` and `src/cascadia/TerminalCore/TerminalApi.cpp:383–417`: ED2's `_EraseAll` can rotate the backing buffer and calls `NotifyBufferRotation`; that explicitly empties the pattern tree. In the probe's full-height alternate buffer containing nonblank rows, this explains the meaningful difference from row erasure.
- `src/cascadia/TerminalCore/Terminal.cpp:1219–1238` and `src/renderer/base/renderer.cpp:1167–1195`: URL-pattern recomputation invalidates old/new pattern ranges, while native hovered underline rendering consults both the cached hovered interval and the current pattern tree. Correctly rewritten text/attributes alone do not make cached native detection current.
- The release includes the scroll-hover refresh associated with [Windows Terminal #20219](https://github.com/microsoft/terminal/issues/20219), but that does not make application-controlled alternate-screen repainting equivalent to terminal viewport scrolling. The separate open report [Windows Terminal #17728](https://github.com/microsoft/terminal/issues/17728), including the maintainers' discussion of deferring URL scanning, describes this class of TUI underline artifact.

These source paths support the host-cache explanation and agree with the physical EL/ECH/full-clear comparisons. They are not an instrumented Windows Terminal trace, proof of a precise physical 100 ms duration, or proof that every possible compliant native invalidation strategy is impossible.

ECH is **not selected for production**. No verified bounded native cleanup has been established. Do not replace it with ordinary full-screen clears, buffer-switch/rotation tricks, terminal-setting changes, or altered labels/activation without an explicitly approved strategy. At that pre-amendment checkpoint the implementation remained at 10/32 tasks and its combined acceptance gate was not waived. PR #355 subsequently approved tracking pre-layout URL and native-ghost work independently in [issue #353](https://github.com/timurproko/a1/issues/353). A host-side change or an alternative beyond that link strategy still requires its own approval; content completion must not close the link issue.

## Content-first renderer checkpoint after PR #355

- Accepted scope amendment: `789c0bc10d7ecdac6dcbdb56b31084c138fdf6fe`; integrated into the preserved implementation at `4995bdb8`. Intervening prompt/editor, autocomplete, and modal/selection changes are retained.
- The physical disappearing/flashing-content baseline remains **unreproduced on an identified original application artifact**. The known 171-by-40 / Windows Terminal 1.24.11911.0 protocol facts above do not identify the original content build, content category, visibility settings, or raw application writes. Legitimate pinned Markdown reflow, navigation, and declared visibility changes must be distinguished from artificial blank, argument-only replacement, omitted, or stale presentations; the original screenshots cannot yet establish that distinction. No new physical content verdict is invented here.
- New vendor-neutral tool rendering metadata retains complete supported arguments and result details. Text parts reference the block's text, and image parts reference the existing session-scoped assets. Diagnostic and rendering metadata share the existing 64 KiB payload budget; unsupported/oversized metadata has a visible fallback without changing the operation outcome. Full history reconstruction uses the same combined-budget path.
- The actual public Pi tool component now receives those inputs, including late images. One pure tool-result adapter replaces the two text-only result reconstructions; Pi owns tool image presentation rather than an outer image wrapper replacing its stateful update path. Redundant execution/argument-completion and expansion notifications are removed. No source-derived renderer fork, dependency edit, or private-state access was needed.
- Mounted presentation revision and callbacks now invalidate affected root rows, document layout, and dock reuse before requesting the real scheduler. Mount/session replacement suppresses obsolete callbacks. A burst of 100 renderer invalidations requests one frame; unaffected finalized rows remain reusable. Ordinary full-view chrome updates no longer invalidate every transcript component, while actual root-wide invalidation also clears its outer caches.
- Actual independent edit-renderer comparisons at widths 40, 80, and 192 cover missing/pending previews, late failed filesystem previews, and an already displayed stale preview replaced by authoritative final details. Structured extension tests retain more than 100 entries, empty content boundaries, complete arguments, and partial/error context. Additional checks cover image replacement with stable renderer state, inline PNG/hidden-image presentation, renderer failure fallback, malformed/cyclic/oversized metadata, and non-serialization of accumulated result text.
- A new real-engine overload regression first failed with `owned-UI tool execution finality is inconsistent`: the old recovery path finalized block status but left tool execution running. Recovery now uses the existing abort/error settlement mapping before its single authoritative view. Both successful and rejected cancellation paths produce valid snapshots; the existing overload flush rejection remains explicit.
- Focused checkpoint report `.artifacts/rendering/content-retention-checkpoint.json`: **308 tests passed across eight suites**, including the 205-test existing session-shell suite. This count includes **one explicit expected failure**: the unchanged wrapped-URL counterexample is retained with `it.fails` and linked to #353. It is not a repaired link test; an unexpected pass requires promoting it back to an ordinary regression.
- Architecture, product identity, source-ledger/provenance, typechecking, and `npm run build` passed. No `test:fast`, `test:full`, or `test:release` local tier ran. CI and physical acceptance remain separate gates.
- Current completion is **14/28 tasks**. Remaining work includes the complete attachment/conversion and oversized-data matrix, asynchronous geometry/off-screen/interleaving evidence, broader producer/parity and negative-control evidence, required implementation CI, and exact-candidate user-controlled content review. Passing this checkpoint does not establish that all reported flashing is fixed.
