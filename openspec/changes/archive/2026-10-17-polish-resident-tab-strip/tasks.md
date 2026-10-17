# Tasks

## 1. Shared Time Format

- [x] 1.1 Add the `timeFormat` owned declaration, default, migration/version step, Generic-section ordering, and current-example labels; verify declaration, resolution, migration, section, and settings-screen tests cover both formats and the 12-hour default.
- [x] 1.2 Add a deterministic local-time formatter and thread the live setting through the owned viewport contract and composition; verify formatter tests cover midnight, noon, afternoon, zero-padding, invalid dates, and uppercase `AM`/`PM`.
- [x] 1.3 Render submitted-prompt and sticky timestamps with the current format while preserving width and metadata styling; verify focused component and session-shell tests cover both formats and a live format change.
- [x] 1.4 Pass the canonical profile settings-file path to native attach and observe its bounded `a1.timeFormat` value live; verify bootstrap and Rust reader tests cover valid, absent, invalid, oversized, and changed documents.

## 2. Restrained Strip Geometry and Hover

- [x] 2.1 Remove close glyphs and close hit regions from tab chips while preserving display-width clipping, active styling, overflow, drag geometry, and whole-chip viewing; verify focused strip render and hit-test fixtures at narrow, wide, Unicode, and overflow widths.
- [x] 2.2 Model tab, overflow, and plus hover as persistent strip state and retain valid hover across status, clock, registry, and child-surface updates; verify enter, leave, geometry-change, stationary-pointer, and unrelated-update tests.
- [x] 2.3 Render the configured native clock with uppercase suffixes and one right-edge blank cell, and render only the plus control over a blank surface when no tabs remain; verify clock boundary/width tests and zero-tab terminal-cell fixtures.

## 3. Native Context Interaction and Close Selection

- [x] 3.1 Preserve effective action-to-shortcut labels and add the clamped two-row `Close`/`Rename` context-menu model, renderer, hover geometry, and pointer/keyboard dismissal; verify default and rebound labels, edge clamping, row activation, outside click, Escape, and target-removal tests.
- [x] 3.2 Route context-menu Rename through the existing inline editor and Close through the existing idle/busy flow without strip notices or child input leakage; verify F2/menu parity, streaming-overlay persistence, commit/cancel, busy confirmation, and no-instruction-text tests.
- [x] 3.3 Capture the active tab's preceding fallback before close and select it after confirmed removal, with next-survivor and concurrent-removal fallback behavior; verify active-middle, active-first, background, last-tab, and concurrent-topology close tests.

## 4. Stable Resident Presentation

- [x] 4.1 Introduce requested-versus-committed view/topology state backed by complete holder surfaces so create, switch, and close commit chip selection and child content together; verify transition tests never pair a new active chip with stale content or transiently remove surviving chips.
- [x] 4.2 Centralize logical-frame output for strip, complete surface, host overlay, and saved/restored cursor in one synchronized bounded write, including terminals that ignore synchronization; verify byte ordering and terminal replay fixtures contain no clear-only, strip-only, leaked-overlay, stale-cursor, or redundant-list frame.
- [x] 4.3 Remove the legacy empty hint and one-line prompt-notice paths, restore obscured cells from the latest complete surface when overlays close, and keep only concise state-derived overlays; verify focused attach tests cover streamed output, overlay dismissal, empty state, refused creation, and failed-tab routing.

## 5. Cross-Boundary Checks

- [x] 5.1 Run the changed TypeScript test files, native terminal-host unit/role tests, TypeScript typecheck, and `openspec validate polish-resident-tab-strip --strict`; confirm each targeted command succeeds without broad preflight substitution.

## 6. v2 Interaction Fidelity

- [x] 6.1 Replace ad hoc context/overflow overlays with a reusable v2-styled popup model and add the grouped `+ Agent` / separator / `Settings` launcher; verify colors, padding, muted shortcuts, clamping, disabled-row navigation, hover, click-away, and stationary-pointer persistence.
- [x] 6.2 Route the Settings launcher through a backwards-compatible server/bridge command into the owned Settings workflow, including create-then-open from an empty strip; verify no command text reaches the editor and unavailable targets fail safely.
- [x] 6.3 Model drag thresholds, midpoint destinations, no-op suppression, exact insertion-marker style, captured registry revision, release/cancel behavior, and authoritative convergence; verify hold, motion, off-strip release, overflow, stale revision, and actual reorder fixtures.
- [x] 6.4 Render rename as an inline chip editor with cursor, Home/End, Backspace/Delete, Ctrl+A, commit/cancel, optimistic manual-name settlement, and no automatic animation; verify F2 and menu parity plus pointer cancellation.
- [x] 6.5 Align normal, hovered, active, plus, and popup styling and lock automatic-name animation to v2's rainbow/typewriter/settle timing and stable geometry; verify truecolor/palette phase boundaries and unrelated-update continuity.

## 7. Refinement Checks

- [x] 7.1 Run the changed TypeScript bridge/composition tests, native strip/attach/server tests, TypeScript typecheck, full JavaScript suite, architecture check, Rust formatting, contracts-only native library tests, and strict OpenSpec validation.
