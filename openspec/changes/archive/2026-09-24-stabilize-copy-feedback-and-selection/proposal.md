## Why

Copy acknowledgement currently becomes a new dock row, shrinking the transcript viewport and making the visible content jump for the lifetime of the message. Frame selection is also stored in terminal-row coordinates, so a highlight over scrolling agent output stays fixed on the screen when that output moves, while selection over pinned status or footer text needs the opposite behavior.

## What Changes

- Present copied-character acknowledgement as transient paint over the existing frame instead of allocating a row or changing viewport/dock geometry.
- Anchor selection endpoints to their originating surface: scrollable agent-stream content moves with its document rows, while pinned dock/status selection stays with its non-scrolling surface.
- Preserve mixed selections across the viewport/dock boundary, clipping off-screen selected content without transferring the highlight to unrelated cells.
- Preserve copy payloads, acknowledgement wording/lifetime, precise grapheme boundaries, asynchronous clipboard behavior, and bare-A1-only ownership.
- Add deterministic component, shell, and terminal-paint evidence for streaming growth, followed scrolling, pinned chrome, cross-surface selection, and copy-feedback geometry.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Make copy acknowledgement layout-neutral and make retained selection follow the scrolling or pinned surface from which each endpoint originated.

## Impact

Implementation will affect complete-frame selection state and projection, viewport frame metadata/composition, shell copy-acknowledgement placement, and focused session-shell/viewport tests. It adds no dependency, changes no persisted setting or clipboard protocol, and leaves `a1 pi`, regular-mode terminal selection, and installed Pi code unchanged.
