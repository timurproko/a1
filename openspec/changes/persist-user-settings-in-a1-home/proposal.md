# Proposal

## Why

A1-owned preferences currently follow the platform control-state directory, so an installation or launch context that changes that directory can make `/settings` appear fresh after an update or reinstall. User choices should instead have one stable home under the user's `.a1` directory, alongside but separate from the pinned agent profile.

## What Changes

- Resolve the normal A1-owned settings document under `<effective-home>/.a1`, independent of the installed package or materialized release location.
- Keep Pi-backed Agent settings in `<effective-home>/.a1/agent/settings.json`; do not merge the A1-owned and Pi-owned document formats.
- Prefer an existing `.a1` settings document, use the former platform configuration location only as a non-destructive compatibility fallback when the new document is absent, and otherwise resolve declared defaults.
- Persist the next accepted A1-owned change to the `.a1` document while preserving accepted and unknown values read from the compatibility source.
- Preserve an explicit `A1_CONFIG_DIR` as an isolated settings-root override for development, tests, and intentional custom profiles.
- Add focused path, persistence, launch preflight, and replacement-release coverage proving settings survive updates and reinstalls without reading package-local state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Define the stable `.a1` location, primary/fallback precedence, lazy compatibility migration, and default behavior for A1-owned preferences.
- `launch-profiles`: Require normal A1 launches across package versions and reinstalls to resolve the same user-owned A1 and Agent settings roots.

## Impact

Expected implementation affects launch-profile path resolution, owned-settings construction and persistence, the pre-UI resident-tabs settings reader, and focused tests. Platform control/data/runtime defaults, release storage, Pi's settings format, the settings UI, and dependencies remain unchanged.
