## Why

Accent color is currently persisted in a shared profile and refreshed into other running sessions. The maintainer wants independent session colors, a blue start every time, the Herdr palette order without its dashed entry, an additional grey choice, and an external integration API.

## What Changes

- Offer exactly blue, green, orange, pink, purple, cyan, and grey in that order, preserving the existing named chromatic palettes and adding a neutral grey palette with the same semantic projection and preview behavior.
- Make bare-A1 Accent color runtime-session state rather than a shared profile preference. Every launch and session replacement starts blue, including resume, new, fork, and import; accepted changes last only for that active session lifetime.
- Ignore legacy profile accent values for interactive startup and live refresh without deleting user settings or changing other profile-shared settings.
- Keep Settings and external writes on one live state/change path, updating semantic foregrounds, derived backgrounds, previews, and current-color reads together.
- Expose a local JSON CLI API for external applications: list available colors, get a targeted live session's color, and set that session's color. Use explicit session identity outside the session shell, not a machine-wide current session.
- Document the command and response contract for integrations such as Herdr, with bounded acknowledgement and explicit errors for invalid colors, stale targets, unavailable sessions, and ambiguous selectors.
- Leave pinned `a1 pi`, standalone install/update progress preference policy, and unrelated settings unchanged. Regenerate shared palette assets to include grey.

## Capabilities

### New Capabilities

- `session-color-control`: externally addressable local get/set/list API for live session colors.

### Modified Capabilities

- `owned-ui-settings`: ordered seven-color palette and session-local, blue-start Accent color semantics.

## Impact

Owned settings declarations/resolution/change routing, neutral accent types, palette generation and projection, composition session lifecycle, early interactive appearance, local runtime coordination, CLI parsing/help/capabilities, integration documentation, and focused palette/settings/lifecycle/API tests. No resident service, HTTP listener, new dependency, or upstream package modification is proposed.
