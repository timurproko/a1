## Why

Opening a modal currently disables A1's transcript pre-input routing even when the content area remains visible, leaving it unscrollable and exposing vanilla fullscreen selection/copy behavior. The reported Model Configuration screenshot is one reproduction; the requested behavior must apply universally to all modal surfaces.

## What Changes

- Keep exposed transcript content scrollable and its A1 scrollbar interactive while any built-in or extension modal, selector, nested dialog, overlay, or replacement input is open.
- Preserve A1's custom transcript selection, semantic clipboard output, and existing copy presentation rather than falling back to vanilla selection or its copy notification.
- Route input by current visible geometry and gesture ownership, not by a global modal-open bypass or a command allowlist. Modal-covered cells and modal keyboard input remain owned by the modal.
- Preserve navigation, selection safety, and correct hit regions across opening, nesting, resizing, closing, and streaming. Fully covering surfaces expose no background hit targets.
- Leave pinned `a1 pi` behavior unchanged and respect configured scrollbar appearance, style, and speed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Require universal coexistence of modal input ownership with scrolling, scrollbar controls, and A1 selection/copy in exposed transcript content.

## Impact

Expected implementation areas are the shared viewport pre-input boundary in `src/integrations/pi/session-ui/session-shell.ts`, viewport interaction controller, shell-root geometry, and the owned runtime's overlay hit-region contract. Regression coverage must include shared controller, shell/runtime integration, modal-family inventory, and exact-build Windows Terminal review. No installed Pi changes, new dependency, modal workflow redesign, or comparison-profile behavior change is proposed.
