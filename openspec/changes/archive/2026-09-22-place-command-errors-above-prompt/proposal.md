## Why

Bare A1 still appends simple command failures and warnings to the transcript even though informational command results already use the transient dock notice above the prompt. In a fresh session, `/export` therefore paints `Error: Failed to export session: Nothing to export yet - start a conversation first` at the top-left of the terminal with a large empty gap before the editor, making the current command result look detached from the action that produced it.

## What Changes

- Present simple workflow errors and warnings in bare A1 through the same transient dock-notice region used for informational messages, directly above the prompt group rather than in transcript content.
- Preserve each message's existing `Error:` or `Warning:` prefix, severity color, padding, wording, and wrapping while allowing the latest workflow notice of any severity to replace the previous notice in place.
- Apply the placement consistently to built-in command failures and extension error/warning notifications while keeping structured command presentations in the transcript.
- Preserve the existing notice dismissal/reset lifecycle and leave the pinned `a1 pi` comparison route unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Bare A1 places simple informational, warning, and error workflow messages in one transient notice above the prompt.

## Impact

Implementation is expected in `src/app/session-shell/session-shell-root.ts`, reusing the existing command-message and status presenters. Focused coverage belongs in the bare-A1 session-shell placement tests, extension-notification tests, and existing command-message parity controls. The derived startup-graph byte ceiling may move by the exact added eagerly reachable source bytes. No engine workflow wording, transcript persistence format, viewport composer, installed Pi package, or pinned comparison presentation changes are intended.
