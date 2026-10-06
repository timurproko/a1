## Why

A long session file path is currently moved wholesale below `File:`, leaving the label stranded even though the first row has room for part of the path. The identity row should read naturally by beginning the path beside its label and continuing only when the available width is exhausted.

## What Changes

- Render the session file value immediately after `File:` whenever the row has space.
- Continue an overlong file value onto subsequent rows without truncating it or changing the surrounding identity-row order and styling.
- Keep the pinned `a1 pi` session presentation unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Refine the bare-A1 Session Info identity-row wrapping contract for long file paths.

## Impact

- Affects the lazy bare-A1 session-reference formatter and its focused rendering tests.
- Changes no session data, path value, dependencies, reference-screen lifecycle, or comparison-profile behavior.
