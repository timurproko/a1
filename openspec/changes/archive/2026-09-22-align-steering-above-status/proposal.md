## Why

Bare A1 bottom-aligns its live working status but leaves pending `Steering:` rows beside earlier transcript content when the viewport has unused space. Pi presents pending steering with the status above the prompt, so the current separation makes queued input look like conversation content.

## What Changes

- Bottom-align fitting pending steering and its edit hint as one transient group with the live working status.
- Keep pending steering immediately above the status, with unused viewport space before the complete group.
- Preserve transient scrolling, end following, pointer suppression, and overflow ordering once content no longer fits.
- Preserve queue editing, transcript selection boundaries, the pinned dock, and the `a1 pi` comparison route.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Keep fitting pending steering with the bottom-aligned live status instead of visually attaching it to semantic transcript content.

## Impact

The implementation is limited to custom viewport transient-tail alignment and focused session-shell coverage. It does not persist steering as transcript history, move it into the dock, change queue lifecycle or styling, alter status ownership, or modify `a1 pi`.
