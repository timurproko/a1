## 1. Build Rendering Evidence Before Changing Production Paints

- [x] 1.1 Add a bounded terminal-write classifier and headless cell-grid replayer for full-screen clears, row clears/writes, scroll regions, synchronized-update boundaries, cursor placement, bytes, and frame timing; verify focused unit tests cover synchronization honored and ignored, malformed streams, and artifact truncation.
- [x] 1.2 Add deterministic streamed prose, incomplete Markdown, thinking, tool output, fit/overflow, long-transcript, resize, and detached-scroll workloads with named semantic and cell checkpoints; verify each fixture is independent of production row-comparison logic.
- [x] 1.3 Add isolated producers for bare `a1`, `a1 pi`, and untouched pinned Pi with equivalent profile, geometry, theme, mode, capabilities, transcript, and input state; verify producer failure, timeout, and process cleanup tests.
- [x] 1.4 Run the default-mode and mode-matched fullscreen matrix against the unchanged baseline, preserve a bounded diagnostic showing the broad stable-row rewrites and transient ownership transition, and verify `a1 pi` remains aligned with untouched Pi in equivalent modes.

## 2. Stabilize Custom Viewport Geometry

- [x] 2.1 Keep queued input, working/extension status, widgets, active input, and footer in one dock region for fitting, overflowing, and detached frames; verify custom-viewport tests cover boundary crossing, queue appearance/removal, no duplication/omission, selection exclusion, and unchanged pinned-profile rows.
- [x] 2.2 Extend the neutral viewport frame result with transcript/dock rectangles, prior and next document ranges, follow state, and safe vertical-shift metadata; verify unit tests cover no shift, one/many-row shifts, detached output, legitimate Markdown reflow, resize, tiny terminals, sticky prompts, selection, overlays, and reset.
- [x] 2.3 Prove the frame descriptor derives only from owned semantic layout state and does not inspect ANSI text, Pi private state, or component constructors; verify architecture and malformed-descriptor tests reject forbidden or inconsistent metadata.

## 3. Add Damage-Aware Fullscreen Painting Through a Public Boundary

- [ ] 3.1 Land or consume a documented public Pi TUI contract for bounded viewport damage/shift hints and pin the released package versions; verify package identity, source provenance, API-boundary governance, install layouts, and upstream conformance without patches or deep imports.
- [ ] 3.2 Carry the neutral frame descriptor through the A1 runtime adapter only for bare A1's custom viewport; verify adapter tests prove `a1 pi`, regular mode, overlays, and components without descriptors retain their current renderer path.
- [ ] 3.3 Implement safe transcript-region scroll painting that moves unchanged cells, restores terminal margins, paints only exposed or genuinely damaged rows, keeps the dock fixed, and positions the cursor in one complete write; verify focused terminal-write and cell-grid tests with one-row and multi-row followed growth.
- [ ] 3.4 Implement capability and safety fallbacks for unsupported synchronized updates, unsupported regional scrolling, OSC 8 links, active selection, sticky/overlay changes, images, resize, theme invalidation, and arbitrary reflow; verify no fallback exposes a blank intermediate grid or performs an undeclared full-screen clear.
- [ ] 3.5 Preserve initial-entry, structural-reset, resize, and image-protocol redraw behavior where required; verify every allowed full-screen clear is cause-classified and ordinary prose/thinking/tool streaming cannot reach it.

## 4. Bound Stream Presentation Cadence

- [ ] 4.1 Add a shell-level coalescer that stores engine semantics immediately but presents at most the newest assistant/thinking/tool block state per measured streaming interval; verify fake-clock tests bound terminal frames rather than only render requests.
- [ ] 4.2 Make input, resize, focus/overlay, selection, and pointer feedback preempt pending streaming presentation and recompute from current state; verify an obsolete queued frame cannot overwrite immediate feedback.
- [ ] 4.3 Make completion, tool end, error, abort, retry/compaction transition, and shutdown supersede pending intermediate states and flush the newest final state; verify ordering, no duplicate final frame, status animation independence, and timer disposal tests.
- [ ] 4.4 Select and document the production streaming interval from the captured frame/latency evidence, with 30 fps as the initial target; verify first-paint, input-paint, and final-paint latency remain within the workload's declared allowance.

## 5. Rendering Stability Regression Gate

- [ ] 5.1 Add logical-damage budgets for every deterministic workload and verify the gate fails on unexpected full-screen clears, repaint outside damage, stable-row rewrites, dock jumps, blank/partial intermediate grids, excessive frames, stale final cells, or missing synchronization classification.
- [ ] 5.2 Cover sustained content while following and detached, fit/overflow crossings, Markdown reflow, thinking, concurrent status animation, streamed tools, queued input, long sessions, resize, selection, sticky prompts, hyperlinks, images, overlays, tiny terminals, and shutdown; verify focused suites pass in synchronization-supported and ignored replay modes.
- [ ] 5.3 Run the independent three-producer/two-mode matrix after remediation and generate bounded human-readable and machine-readable results attributing component, mode, viewport, and paint differences; verify bare A1 meets its damage budgets and both Pi comparison producers remain unchanged.
- [ ] 5.4 Run focused typechecking, architecture, component, viewport, runtime, engine, package-identity, and rendering-evidence checks needed for debugging, then push the implementation branch and use CI as the required full automated gate.

## 6. Exact-Artifact Acceptance

- [ ] 6.1 Provide the exact implementation worktree, branch/commit, build command, deterministic evidence command, and color-preserving `./scripts/dev` / `./scripts/dev pi` comparison steps, including expected stable behavior and known fallback cases.
- [ ] 6.2 Obtain user-controlled visual acceptance on the exact built artifact under sustained prose, Markdown reflow, tool output, fit/overflow crossing, and resize in Windows Terminal, recording terminal version and synchronized-update support; do not weaken automated damage budgets to match a failed visual verdict.
- [ ] 6.3 If acceptance fails, retain the evidence, disable the new damage/coalescing path without changing `a1 pi`, and keep the code pull request unmerged; if it passes and CI is green, leave manual merge to the user's explicit authorization and hand off acceptance recording/archive to the required specification-only follow-up.
