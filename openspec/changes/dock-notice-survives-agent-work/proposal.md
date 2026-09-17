## Why

The dock notice delivered by `bottom-info-notices` (#467) is dismissed whenever any transcript block with a new identity is mounted. That rule was copied from v2, where Pi's chat container gains one component per message, but bare A1 splits one agent turn into more blocks: the assistant message, each tool call, each tool result, and compaction records each mount separately. A model switch made while the agent works is therefore retired within about a second by the next tool or assistant block, which is exactly the case the notice exists for, and the run finishing can retire it too. The notice text is also rendered with the session's output pad, which is zero in bare A1, so it sits flush against the left edge while the v2 capture and Pi's status text indent by one cell.

## What Changes

- Retire the notice only when the reader submits their next prompt or shell command (a `user` or `bash` block mounts), when a non-informational workflow presentation lands in the transcript, or when workflow presentation is reset; assistant, tool, custom, and compaction blocks starting or updating, and the agent finishing, keep it.
- Pad the notice text by Pi's fixed one-cell status padding instead of the output pad setting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: the transient dock notice survives agent work and is retired by the reader's next submission; its text carries Pi's one-cell padding.

## Impact

Implementation affects the notice dismissal in `#mountTranscript` and the notice padding in `src/integrations/pi/session-ui/session-shell-root.ts`, the bare-A1 notice fixture in `test/integrations/pi/session-ui/session-shell.test.ts`, and the startup graph byte baseline. Error, warning, and reset dismissal, the pinned `a1 pi` route, and the working-status tail are unchanged.
