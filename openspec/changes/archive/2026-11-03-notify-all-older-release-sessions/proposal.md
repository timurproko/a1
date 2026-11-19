## Why

A verified automatic update can become active while older resident or solo sessions keep running, but those sessions currently learn that restart is required only after their own registry discovery succeeds. A failed or stale discovery can therefore hide `Update installed, restart to update`, and the resident tab bar does not identify which A1 version the attached client is actually running.

## What Changes

- Observe the local approved active release independently of registry discovery so every eligible Auto-mode process still executing an older same-channel release shows restart readiness promptly.
- Keep failed, disabled, malformed, pending, same-version, and cross-channel states silent, and stop local observation after the process becomes restart-ready or disposes.
- Show the executing resident attach-client version on the right side of the tab bar before the clock.
- Add a live Tab Bar setting with a searchable multi-select dialog for independently showing or hiding `Version` and `Time`; default both items on and preserve the fixed Version-then-Time order.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-self-update`: Decouple restart-readiness observation from successful registry discovery for older Auto-mode processes.
- `owned-pi-ui-foundation`: Require every eligible older owned session to receive persistent restart readiness after local activation is observed.
- `multi-agent-tabs`: Add configurable right-side Version and Time items to the resident tab strip.
- `owned-ui-settings`: Add the live Tab Bar right-side-items setting and its multi-select configuration dialog.

## Impact

- Release observation and automatic-update state readers under `src/composition/` and `src/foundation/release/`.
- Owned setting declarations, persistence/migration, Settings dialogs, and setting inventories.
- Native resident attach settings polling and tab-strip layout/rendering.
- Focused TypeScript and Rust tests for multi-session update notification, version rendering, live settings changes, narrow layouts, and configuration behavior.
