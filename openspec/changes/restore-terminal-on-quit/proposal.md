## Why

Invoking `/quit` or pressing `Ctrl+C` twice can stop the agent backend while leaving A1's fullscreen terminal surface active, so the process does not return control to the parent shell. The quit autocomplete also exposes an unnecessary product-qualified description instead of the concise `Quit` label.

## What Changes

- Make `/quit` complete the entire owned-UI shutdown path, including terminal restoration and process completion.
- Make the second `Ctrl+C` in the existing clear/exit chord use the same complete shutdown path.
- Present the built-in quit command description as `Quit`.
- Add focused lifecycle and terminal-host regression coverage for both quit entry points.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require user-initiated quit routes to restore the owned terminal and return control to the parent shell, with concise quit-command presentation.

## Impact

- Affected areas: owned Pi session-shell shutdown coordination, workflow-result handling, slash-command autocomplete metadata, and process/terminal lifecycle tests.
- No public API, dependency, session-format, or keybinding changes are intended.
