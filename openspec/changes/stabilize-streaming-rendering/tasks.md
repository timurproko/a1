## 1. Build Rendering Evidence Before Changing Production Paints

- [ ] 1.1 Add a bounded terminal-write classifier and headless cell-grid replayer for full-screen clears, row clears/writes, scroll regions, synchronized-update boundaries, cursor placement, bytes, and frame timing; verify focused unit tests cover synchronization honored and ignored, malformed streams, and artifact truncation.
- [ ] 1.2 Add deterministic streamed prose, incomplete Markdown, thinking, tool output, fit/overflow, long-transcript, resize, and detached-scroll workloads with named semantic and cell checkpoints; verify each fixture is independent of production row-comparison logic.
- [ ] 1.3 Add isolated producers for bare `a1`, `a1 pi`, and untouched pinned Pi with equivalent profile, geometry, theme, mode, capabilities, transcript, and input state, using bounded scheduling and workload-specific startup/completion deadlines; verify back-to-back invocation, producer failure, diagnostic timeout, Windows process-tree cleanup, and no orphan tests.
- [ ] 1.4 Run the default-mode and mode-matched fullscreen matrix against an immutable provenance-labelled baseline, preserve bounded captured diagnostics for broad stable-row rewrites and the historical transient ownership transition, and verify repeated reports derive current findings from checkpoints, never present baseline facts as current behavior, and keep `a1 pi` aligned with untouched Pi in equivalent modes.

## 2. Stabilize Custom Viewport Geometry

- [ ] 2.1 Keep queued input, non-working status, widgets, active input, and footer in one dock region while live working/extension-working status remains in one transient non-selectable scrollable tail for fitting, overflowing, and detached frames; verify custom-viewport tests cover boundary crossing, queue appearance/removal, scrolling the live status out of view, no duplication/omission, selection exclusion, and unchanged pinned-profile rows.
- [ ] 2.2 Extend the neutral viewport frame result with transcript/dock rectangles, prior and next document ranges, follow state, and safe vertical-shift metadata; verify unit tests cover no shift, one/many-row shifts, detached output, legitimate Markdown reflow, resize, tiny terminals, sticky prompts, selection, overlays, and reset.
- [ ] 2.3 Prove the frame descriptor derives only from owned semantic layout state and does not inspect ANSI text, Pi private state, or component constructors; verify architecture and malformed-descriptor tests reject forbidden or inconsistent metadata.

## 3. Add Damage-Aware Fullscreen Painting Through a Public Boundary

- [ ] 3.1 Define an A1-owned damage-presentation contract over the existing public terminal/runtime ports and pin its accepted one-write grammar to the installed Pi package identity; verify source-provenance, install-layout, API-boundary, and conformance governance forbids Pi package edits, private/deep imports, prototype patches, broad terminal parsing, and any upstream PR/release dependency.
- [ ] 3.2 Carry frame identity plus the neutral descriptor from the owned root to the terminal adapter for exactly one corresponding bare-A1 custom-viewport write; verify adapter tests prove stale/missing descriptors fail closed and `a1 pi`, regular mode, overlays, and components without descriptors retain their current renderer path.
- [ ] 3.3 Implement finite-grammar validation and safe transcript-region scroll painting that moves unchanged cells, restores terminal margins, paints only exposed or genuinely damaged rows, keeps the dock fixed, and preserves validated cursor placement in one complete write; verify focused terminal-write and cell-grid tests with one-row and multi-row followed growth.
- [ ] 3.4 Implement fail-closed capability and safety handling for grammar drift, unsupported synchronized updates, unsupported regional scrolling, OSC 8 links, active selection, sticky/overlay changes, images, resize, theme invalidation, and arbitrary reflow; verify rejection forwards the complete original Pi write without partial output, blank intermediate grids, or undeclared full-screen clears.
- [ ] 3.5 Preserve initial-entry, structural-reset, resize, image-protocol, and ordinary Pi fallback behavior where required; verify every allowed full-screen clear and every transformed/bypassed write is cause-classified and ordinary safe prose/thinking/tool shifts use the owned bounded path.

## 4. Bound Stream Presentation Cadence

- [ ] 4.1 Add a shell-level coalescer that stores engine semantics immediately but presents at most the newest assistant/thinking/tool block state per measured streaming interval; verify fake-clock tests bound terminal frames rather than only render requests.
- [ ] 4.2 Make input, resize, focus/overlay, selection, and pointer feedback preempt pending streaming presentation and recompute from current state; verify an obsolete queued frame cannot overwrite immediate feedback.
- [ ] 4.3 Make completion, tool end, error, abort, retry/compaction transition, and shutdown supersede pending intermediate states and flush the newest final state; verify ordering, no duplicate final frame, status animation independence, and timer disposal tests.
- [ ] 4.4 Select and document the production streaming interval from the captured frame/latency evidence, with 30 fps as the initial target; verify first-paint, input-paint, and final-paint latency remain within the workload's declared allowance.

## 5. Rendering Stability Regression Gate

- [ ] 5.1 Add logical-damage budgets for every deterministic workload and verify the gate fails on unexpected full-screen clears, repaint outside damage, stable-row rewrites, dock jumps, blank/partial intermediate grids, excessive frames, stale final cells, or missing synchronization classification.
- [ ] 5.2 Cover sustained content while following and detached, fit/overflow crossings, Markdown reflow, thinking, concurrent status animation, streamed tools, queued input, long sessions, resize, selection, sticky prompts, hyperlinks, images, overlays, tiny terminals, and shutdown; verify focused suites pass in synchronization-supported and ignored replay modes.
- [ ] 5.3 Run the independent three-producer/two-mode matrix after remediation and generate bounded human-readable and machine-readable results that separately label immutable baseline evidence and current captured behavior while attributing component, mode, viewport, and paint differences; verify bare A1 meets its damage budgets, findings are checkpoint-derived, repeated runs complete deterministically, and both Pi comparison producers remain unchanged.
- [ ] 5.4 Run focused typechecking, architecture, component, viewport, runtime, engine, package-identity, and rendering-evidence checks needed for debugging, then push the implementation branch and use CI as the required full automated gate.

## 6. Exact-Artifact Acceptance

- [ ] 6.1 Provide the exact implementation worktree, branch/commit, build command, deterministic remediated-evidence command, and color-preserving `./scripts/dev` / `./scripts/dev pi` comparison steps that directly exercise sustained streaming, including expected stable behavior and known fail-closed fallback cases; do not present a baseline-only diagnostic as acceptance.
- [ ] 6.2 Obtain user-controlled visual acceptance on the exact built artifact under sustained prose, Markdown reflow, tool output, fit/overflow crossing, and resize in Windows Terminal, recording terminal version and synchronized-update support; do not weaken automated damage budgets to match a failed visual verdict.
- [ ] 6.3 If acceptance fails, retain the evidence, disable the new damage/coalescing path without changing `a1 pi`, and keep the code pull request unmerged; if it passes and CI is green, leave manual merge to the user's explicit authorization and hand off acceptance recording/archive to the required specification-only follow-up.
