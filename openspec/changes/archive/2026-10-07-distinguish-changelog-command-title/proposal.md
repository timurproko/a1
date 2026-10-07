## Why

The bare-A1 `/changelog` command currently opens a screen titled `What's New`, making an on-demand history view look like the one-time release update shown after an upgrade. The titles should identify those two entry points distinctly.

## What Changes

- Title the bare-A1 reference screen opened by `/changelog` as `Changelog`.
- Keep `What's New` for the automatic current-release note opened on the first eligible launch after an update.
- Preserve the packaged note content, release-note acknowledgement lifecycle, reference-screen behavior, and pinned `a1 pi` presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Distinguish the on-demand changelog title from the automatic post-update release-note title.

## Impact

The owned reference-route title selection and its focused composition tests will change. The shared reference-screen implementation, packaged release notes, startup route timing and acknowledgement, and pinned in-feed changelog presenter remain unchanged.
