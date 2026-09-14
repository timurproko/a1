## Why

Bare `a1` shows visible instability while assistant content streams, including flicker that is not present in vanilla Pi or the pinned `a1 pi` comparison. The three paths reuse the same Pi transcript components, but bare A1 alone forces the custom fullscreen viewport: as follow-tail advances, its position-based screen diff can clear and rewrite most transcript rows for one newly wrapped row, and its transient surfaces also need stable ownership across the fit/overflow boundary. Existing parity and responsiveness tests verify content and event cost, not terminal paint stability, so this regression is currently invisible to automation.

## What Changes

- Add an equivalent-state rendering analysis that captures semantic frames and raw terminal writes from bare `a1`, `a1 pi`, and untouched pinned Pi at the same geometry, mode, theme, transcript, and deterministic stream cadence.
- Classify every paint by cause and measure frame cadence, cleared/rewritten rows, bytes, full redraws, viewport shifts, stable-row rewrites, and dock geometry changes, with bounded artifacts suitable for diagnosing terminal-visible flicker.
- Make follow-tail streaming damage-aware through an A1-owned presentation adapter over Pi's public terminal boundary, so ordinary text growth does not repaint stable transcript rows merely because the viewport advanced by one row; use bounded terminal-region movement and avoid whole-screen clears outside declared structural cases.
- Keep the editor/footer group and other true dock surfaces stably docked while pending steering and live working/extension-working rows remain in one non-selectable transient viewport region; bottom-align fitting working status with flexible viewport space so short output does not jump, then let steering and status scroll naturally after overflow.
- Coalesce presentation to a deliberate streaming cadence while preserving immediate input feedback, final content, status animation, and the existing per-block engine update path.
- Add deterministic regression gates and exact-artifact manual comparison for sustained prose, Markdown reflow, thinking, tools, fit/overflow crossing, long transcripts, resize, detached scrolling, and terminals with and without synchronized-update support.
- Preserve `a1 pi` and untouched Pi as independent comparison producers; do not change their profile, rendering policy, or visible output.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `custom-session-viewport`: Require visually stable, damage-bounded streaming frames and stable viewport/dock ownership while retaining v2-visible working-status alignment, scrollable pending steering, follow-tail, detached scrolling, sticky prompts, and viewport controls.
- `owned-pi-ui-foundation`: Require independent terminal-paint evidence, bounded streaming presentation cadence, and rendering-quality regression coverage in addition to semantic parity and responsiveness.

## Impact

- Affected areas: Pi engine-to-shell event presentation, custom session viewport composition, Pi TUI runtime adaptation, terminal-frame diagnostics, focused integration tests, and OpenSpec acceptance evidence.
- The implementation will keep the pinned Pi packages untouched and add an A1-owned, fail-closed presentation adapter over public terminal/runtime ports; it SHALL NOT depend on an upstream Pi pull request or release. Private imports, prototype patches, installed-package edits, and stock `InteractiveMode` construction remain prohibited.
- No CLI, session format, extension contract, profile isolation, or model behavior changes are intended. Bare A1 remains fullscreen and keeps its custom viewport; `a1 pi` remains the oracle.
- The accepted `restore-v2-transient-tail-layout` change supersedes this plan's earlier queued-input dock ownership and immediate-after-transcript fitting-status placement; all rendering evidence and remediation consume the reconciled model.
