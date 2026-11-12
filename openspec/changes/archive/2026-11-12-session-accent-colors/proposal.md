## Why

Accent color is currently persisted in a shared profile and refreshed into other running sessions. The maintainer wants independent current session colors, a configurable startup default initially set to blue, the Herdr palette order without its dashed entry, an additional grey choice, and an external integration API.

## What Changes

- Offer exactly blue, green, orange, pink, purple, cyan, and grey in that order, preserving the existing named chromatic palettes and adding a neutral grey palette with the same semantic projection and preview behavior.
- Split Appearance color settings into persisted `Default color` and session-local `Current color`, both using the ordered palette. Default color initially resolves to blue and controls future starts; Current color changes only the active session.
- Initialize Current color from Default color on every launch and successful session replacement, including resume, new, fork, and import. Changing Default color does not recolor any running session.
- Ignore legacy profile accent values for interactive startup and live refresh without deleting user settings. Persist the new default separately and retain unrelated settings behavior.
- Keep Settings and external writes on one live state/change path, updating semantic foregrounds, derived backgrounds, previews, and current-color reads together.
- Expose a local JSON CLI API for external applications: list available colors, get a targeted live session's color, and set that session's color. Return JSON success and error responses by default without a `--json` flag. Use explicit session identity outside the session shell, not a machine-wide current session.
- Document the command and response contract for integrations such as Herdr, with bounded acknowledgement and explicit errors for invalid colors, stale targets, unavailable sessions, and ambiguous selectors.
- Leave pinned `a1 pi`, standalone install/update progress preference policy, and unrelated settings unchanged. Regenerate shared palette assets to include grey.

## Capabilities

### New Capabilities

- `session-color-control`: externally addressable local get/set/list API for live session colors.

### Modified Capabilities

- `owned-ui-settings`: ordered seven-color palette, persisted Default color, session-local Current color, and startup initialization from the configured default.

## Impact

Owned settings declarations/resolution/change routing, neutral accent types, palette generation and projection, composition session lifecycle, early interactive appearance, local runtime coordination, CLI parsing/help/capabilities, integration documentation, and focused palette/settings/lifecycle/API tests. No resident service, HTTP listener, new dependency, or upstream package modification is proposed.
