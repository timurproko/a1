## Why

Bare A1 tells users to press `Alt+Up` to take pending steering messages back into the editor, but on Windows and WSL its active default binding is `Alt+Q`, so the advertised shortcut does nothing. The dispatch declaration and every visible hint need to agree across supported platforms and user overrides.

## What Changes

- Make `Alt+Up` the default bare-A1 agent-input action for restoring all pending steering and follow-up messages to the editor on every supported platform.
- Keep the pinned `a1 pi` comparison profile's platform-specific upstream binding unchanged.
- Derive startup help and the pending-queue edit hint from the effective bare-A1 dequeue declaration instead of hardcoded shortcut text.
- Preserve explicit user keybinding overrides and the existing queue ordering, clearing, attachment recovery, and editor restoration behavior.
- Add focused dispatch and presentation regression coverage for defaults, overrides, queued steering, and profile isolation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-shortcuts`: Define the cross-platform bare-A1 queued-message restore default and require its visible hints to reflect the effective binding.

## Impact

The expected implementation surface is the owned input keybinding profile, startup and queued-input presenters, the shell composition that supplies effective bindings, and focused component/session-shell tests. No command syntax, persisted keybinding format, queue protocol, dependency, release format, or canonical pinned-profile behavior changes are intended. Existing user overrides remain authoritative without migration.
