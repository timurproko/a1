## Why

Bare `a1` accepts the same keyboard input as `a1 pi`, but typing, editing, submitting, and menu navigation can reach the terminal noticeably later because each input callback can be followed by synchronous custom-viewport composition and fullscreen presentation before more terminal input is serviced. Existing streaming-responsiveness and rendering-stability evidence does not compare keyboard receipt, semantic application, scheduling, and terminal paint across bare `a1`, `a1 pi`, and pinned Pi, so this regression can remain both perceptible and unmeasured.

## What Changes

- Define comparative keyboard input-to-paint evidence for bare `a1`, `a1 pi`, and pinned Pi using equivalent geometry, input sequences, state, and isolated producer processes.
- Cover ordinary typing, rapid text bursts, cursor movement, deletion, submit, held/repeated menu navigation, replacement input surfaces, long transcripts, and input concurrent with streaming.
- Record input receipt, semantic application, render request, frame composition, terminal write, presented state, pending-frame depth, and stale-input backlog so routing delay is distinguishable from paint cost.
- Require bare `a1` to preserve every input in order while presenting the first eligible state immediately and converging on the latest rapid-input state without rendering every superseded intermediate state.
- Make keyboard-driven custom-viewport presentation proportional to the changed input or dock surface, with conservative fallback when viewport geometry or rendering safety is uncertain.
- Establish deterministic structural gates, same-run comparative latency budgets, and exact-artifact Windows Terminal acceptance against `a1 pi`; wall-clock diagnostics alone do not replace physical responsiveness approval.
- Keep `a1 pi`, pinned Pi, installed Pi packages, regular-mode behavior, shared input/menu/component semantics, and terminal protocol handling unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Extend owned-shell responsiveness and comparative evidence requirements from streaming input to idle and streaming keyboard input-to-paint behavior across default editors, menus, and replacement input surfaces.
- `custom-session-viewport`: Require the bare-A1 fullscreen viewport to present keyboard-driven dock changes without stale-input backlog or unnecessary stable-transcript work while preserving focus, input ordering, layout, and conservative rendering fallback.

## Impact

The implementation is expected to affect the A1-owned Pi session shell, custom viewport composition and caching, runtime render scheduling, terminal presentation adapters, deterministic rendering/input producers, validation budgets, and focused integration tests. Public Pi APIs remain the boundary: no private/deep imports, prototype or runtime patches, installed-package edits, or changes to comparison-mode and vanilla-Pi behavior are permitted.
