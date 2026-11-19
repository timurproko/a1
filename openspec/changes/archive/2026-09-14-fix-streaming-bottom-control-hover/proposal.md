## Why

The user reports that bare A1's "Jump to bottom" control frequently fails to show hover while output is generated and they scroll and point at it. Read-only investigation reproduced a stale dock-only frame after editor input and a subsequent hover report, but did not reproduce the scroll-only symptom; fixing the proven race must be paired with terminal-paint evidence rather than treating it as a complete diagnosis.

## What Changes

- Revalidate a pending dock-only reuse decision against the current viewport interaction revision at composition time, so a pointer or navigation update after keyboard input cannot reuse an obsolete button state.
- Preserve the provenance of reused viewport rows: a reused frame must not be labelled with newer interaction or content state that it never composed. Check the existing content, geometry, selection, and ownership invalidation inputs without turning ordinary same-height typing into full-transcript work.
- Require the first input-driven presentation to show the current bottom-control hover, visibility, and hit region; pending streaming presentation must not restore older feedback.
- Add deterministic interleaved editor/pointer/streaming regression coverage and actual terminal-cell background assertions, including a separate wheel-and-hover streaming workload with no editor input.
- Capture bounded diagnostic evidence for report receipt, reuse decisions, composed control state, and emitted paint when investigating the reported symptom. Keep a missing terminal report distinct from a received report whose visual feedback was lost, and leave an unreproduced or contradicted physical symptom explicitly unresolved.
- Retain the existing stationary-cursor behavior, theme roles, control placement, click ownership, detached reading position, transient-tail layout, and pinned comparison paths.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `custom-session-viewport`: Strengthen bottom-control current-state presentation and dock-only reuse safety across interleaved input, and require hover-specific terminal-paint and exact-artifact acceptance evidence.

## Impact

- Expected implementation focus: `src/integrations/pi/session-ui/session-shell-root.ts`, with the existing viewport controller, neutral viewport component, runtime input coordination, and stream-presentation paths used for integration and evidence.
- Expected tests: focused viewport/controller/shell cases plus the existing terminal capture and cell-replay support. Diagnostics remain bounded and test-only or explicitly opt-in; no general mouse logger is introduced.
- No dependency update, installed Pi modification, private Pi API, new terminal authority, protocol-mode change, CLI change, settings migration, or persisted session change is intended. `a1 pi` and untouched Pi remain unchanged.
- This is a follow-up to the archived `fix-jump-to-bottom-stationary-hover` change, not a replacement for its coordinate-derived hover model. It uses the shipped rendering/coalescing infrastructure described by `stabilize-streaming-rendering` without claiming that change's broader acceptance or reopening its implementation scope.
- This pull request contains planning artifacts only. The confirmed race and the scroll-only physical report have separate evidence and acceptance outcomes; success on one must not silently close the other.
