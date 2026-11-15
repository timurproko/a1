# Shared integration API and coordinated Herdr color migration

## Why

Color-only commands couple consumers to a feature rather than a stable integration boundary. The approved breaking migration gives A1 Settings and external consumers one settings authority and Herdr one reusable client, without another agent process or transport.

## What Changes

- Move reusable settings declarations, resolution and persistence into an application settings owner; retain UI projection and the existing engine settings port/coordinator.
- Replace `session color` with `a1 api <request-json>`: versioned, correlated discovery, supported settings descriptors/read/update and exact-session snapshots.
- Preserve private IPC fencing, acknowledged live application, startup override and replacement behavior. Expose only profile Default color and session Current color initially.
- Migrate canonical external Herdr sources to a shared packaged client, native identities only, and the same settings contract. Document source/build/deployment state and coordinated rollout.

## Capabilities

### New Capabilities
- `integration-api`: bounded public invocation contract and supported settings operations.

### Modified Capabilities
- `session-color-control`: shared settings operations replace dedicated color commands; exact runtime targeting is mandatory.
- `owned-ui-settings`: application-owned settings authority serves both API and UI.

## Impact

CLI, application settings, runtime composition, owner policy, focused fixtures and integration documentation change. Herdr edits live outside this Git repository under the yadm-managed canonical customization project and are not included in this PR. Breaking changes are approved; merge, publication, live restarts, native changes, CI repair automation and consumer deployment before matching installation support are not authorized.
