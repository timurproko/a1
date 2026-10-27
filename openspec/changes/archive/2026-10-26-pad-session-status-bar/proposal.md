# Proposal

## Why

Bare A1's session status bar currently lets its built-in path, usage, and extension-status text touch the terminal edges. Extensions that replace the footer render through the same unpadded region, so a plugin can also draw status-bar content in the first or last terminal column. The complete status area should use the same one-cell horizontal breathing room on every line, regardless of whether A1 or a plugin supplies that line.

## What Changes

- Reserve one terminal cell at the left and right of every bare-A1 session status-bar line.
- Apply the inset to all built-in footer rows, merged extension-status rows, and every row returned by an extension-provided custom footer.
- Give footer renderers the reduced inner width so their wrapping, truncation, and alignment decisions fit between the gutters, and keep ANSI styling and narrow-terminal output width-safe.
- Leave the explicit `a1 pi` comparison profile and non-footer extension surfaces unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: inset every bare-A1 session footer/status-bar row by one terminal cell on both sides, including custom extension footers.

## Impact

Expected work is localized to the session-shell footer composition boundary and focused shell tests for built-in, extension-status, custom multi-line footer, narrow-width, and comparison-profile behavior. No extension API, session model, setting, dependency, or footer content change is intended.
