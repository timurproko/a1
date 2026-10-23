## Why

An upward transcript drag can leave the top content row out of the selected range because its moving endpoint is projected one row below the pointer. The visible range therefore disagrees with standard reverse text selection and with the row where the reader stopped dragging.

## What Changes

- Map an upward frame-selection endpoint to the transcript content row under the pointer without a one-row downward offset.
- Select that top endpoint row only through the pointer column using the existing inclusive-grapheme semantics.
- Keep prompt/editor rows outside the transcript range unless the pointer actually crosses into an eligible prompt-owned selection path.
- Add focused forward/reverse, transcript-boundary, copy, and paint regressions while preserving edge auto-scroll and existing gesture ownership.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Require upward transcript drags to include the pointed top content row with standard endpoint-column behavior and no prompt-row spillover.

## Impact

- Primary implementation targets: transcript selection coordinate projection and session viewport pointer routing.
- Regression coverage: transcript viewport and session-shell selection tests, including rendered selection cells and copied text.
- No changes to prompt-editor keyboard selection, terminal-owned regular-mode selection, `a1 pi`, clipboard transport, dependencies, or installed Pi code.
