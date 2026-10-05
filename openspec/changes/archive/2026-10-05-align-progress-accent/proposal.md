## Why

A1's fresh-install and self-update progress bars still hardcode the former teal `#8abeb7`, while the pinned Pi controls now use the semantic accent role and render violet in the current theme. The progress bars therefore look detached after a Pi upgrade, and another upstream accent change would require finding and editing duplicate RGB literals again.

## What Changes

- Replace the fixed teal completed segment in both progress renderers with one shared release-owned accent presentation derived from the pinned Pi theme's semantic `accent` role.
- Keep the dependency-free installer and the main self-updater on the same shared palette resource without adding Pi or other runtime dependencies to the installer.
- Make Pi-upgrade synchronization refresh the shared accent resource and validate drift, so later pinned-theme changes update install and update progress together.
- Preserve the existing muted track, neutral percentage, 40-cell geometry, progress calculations, cleanup, child-output isolation, and success/failure transcripts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Self-update's completed progress segment follows the release's shared semantic accent instead of a fixed historical RGB value.
- `silent-installer`: Fresh-install progress consumes the same shared semantic accent resource while retaining a dependency-free, tightly bounded package surface.

## Impact

- Affects the shared progress-palette resource, `src/foundation/release/update.ts`, `packages/a1-install/bin/a1-install.js`, Pi-upgrade synchronization, installer packaging, and focused progress/package tests.
- The installer artifact gains only the declared shared palette asset; it does not gain a runtime dependency graph or terminal-query protocol.
- Does not change update or installation target resolution, mutation, activation, rollback, publication channels, or non-interactive output.
