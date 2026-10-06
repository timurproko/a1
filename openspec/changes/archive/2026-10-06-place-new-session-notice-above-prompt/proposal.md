## Why

Bare A1 currently appends `✓ New session started` at the top of the empty transcript after `/new`, leaving the confirmation visually detached from the prompt where the next action occurs. The confirmation should sit beside the prompt while the new session is idle, then yield cleanly to the live working status as soon as the reader sends the first prompt.

## What Changes

- Present bare A1's successful `/new` confirmation as transient prompt-adjacent chrome directly above the input instead of transcript content.
- Preserve the existing accent checkmark, wording, wrapping, horizontal padding, and surrounding blank-row treatment.
- Remove the confirmation when an accepted prompt starts work so the live working status replaces it rather than appearing alongside it.
- Keep failed/cancelled `/new` outcomes, other structured command presentations, and the pinned `a1 pi` route unchanged.
- Add focused rendering and lifecycle coverage for an empty new session, first-prompt transition, transcript/selection exclusion, and pinned-route compatibility.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: place the successful new-session confirmation above the idle prompt and replace it with live working status on the first accepted prompt.

## Impact

The change affects bare-A1 command-result routing and prompt-adjacent rendering in `src/app/session-shell/session-shell-root.ts`, with focused session-shell tests and a custom-session-viewport specification delta. It does not change the workflow result wording, engine session lifecycle, persisted transcript, generic notice behavior, or `a1 pi` presentation.
