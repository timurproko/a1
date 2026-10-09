## Why

Bare A1 currently distinguishes different pasted files or folders with the same basename by appending an opaque random hash to the later chip. The label should instead identify the path visibly, restoring the shortest path-suffix disambiguation used by the v2 prototype so readers can tell which item they selected.

## What Changes

- Keep the basename-only chip for a non-conflicting pasted file or folder and for repeated references to the same normalized path.
- When a different path conflicts with an existing file or folder chip label, show the shortest trailing path suffix that distinguishes it, using forward slashes (for example, `parent/shared`), rather than a random hash.
- Extend the suffix through additional parent segments when needed, with the normalized full path as the final deterministic label.
- Preserve file, image-file, and folder icons plus exact copy, history, and submission expansion to each chip's full path.
- Budget path-list presentation against the longest deterministic path label so disambiguation retains the existing bounded compact-paste fallback.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Define deterministic, path-revealing labels for colliding pasted path chips and retain bounded path-list presentation.

## Impact

The later implementation will affect the session-shell path-chip presentation and chip-store collision handling plus focused paste/chip tests. It requires no persisted-data migration, dependency change, clipboard transport change, attachment change, installed Pi modification, or `a1 pi` behavior change.
