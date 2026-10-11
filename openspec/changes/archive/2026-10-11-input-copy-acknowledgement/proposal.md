## Why

Bare A1 confirms successful frame-selection copies beside the prompt, but copying a keyboard-selected range inside the prompt with `Ctrl+C` gives no visible confirmation. The same clipboard action therefore has inconsistent feedback depending on which selection owner handled it.

## What Changes

- Show the existing transient `copied N chars to clipboard` acknowledgement after a keyboard-selected prompt range is successfully copied with `Ctrl+C`.
- Count the exact expanded editor text submitted to the clipboard and wait for the bounded clipboard route to report success before acknowledging it.
- Keep prompt cut, `/copy`, failure reporting, selection collapse, clipboard delivery, and comparison-profile behavior unchanged.
- Fence delayed prompt-copy completion with the same newest-copy intent used by frame copies so stale success cannot replace newer feedback.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Extends the existing prompt-adjacent copy acknowledgement to successful `Ctrl+C` copies of keyboard-selected prompt text.

## Impact

Expected implementation areas are the prompt-selection copy callback, shell editor option boundary, shell copy completion handling, and focused prompt/selection tests. The change reuses the existing bounded response-copy coordinator and acknowledgement presenter, adds no dependency or setting, and leaves installed Pi sources unchanged.
