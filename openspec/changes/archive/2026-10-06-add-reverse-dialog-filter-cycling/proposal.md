## Why

Bare A1's filter-cycling dialogs use `Tab` to move forward, but they do not consistently recognize `Shift+Tab` as the reverse operation. This makes multi-state filters slower to traverse and makes the standard forward/reverse keyboard relationship inconsistent across dialogs.

## What Changes

- Make `Shift+Tab` cycle backward wherever a bare-A1 dialog already uses `Tab` to change a filter or scope: Models, Resume Session, and Session Tree.
- Preserve each dialog's query, selection, and existing filter-specific behavior while changing direction.
- Keep the visible shortcut hints concise and unchanged; they continue to advertise only `Tab filter` or `Tab scope`.
- Keep reverse Tab modal-local so the ordinary agent input retains its established unassigned, inert `Shift+Tab` behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define backward filter cycling and unchanged hint presentation for Tab-filtered dialogs.

## Impact

Expected implementation is limited to the Models, Resume Session, and Session Tree input handlers, their focused interaction tests, and any small shared modal-input helper needed to recognize reverse Tab consistently. It changes no filter membership, persisted settings, ordinary editor keybindings, pinned comparison behavior, dependencies, or public APIs.
