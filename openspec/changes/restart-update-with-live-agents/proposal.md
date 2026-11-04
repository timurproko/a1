## Why

Automatic update prepared and approved development release 1240, but the installed user's transaction remained at `certified` with `resident continuity check timed out`; active release 1239 stayed selected. The normal session then displayed `Update prepared; activation blocked`, exposing internal state without giving the user a working restart path. The expected experience is automatic installation, the existing green `Update installed, restart to update` notice, and an ordinary app-window restart that reconnects the same running agents without losing work.

## What Changes

- Repair the bounded continuity-inspection and prepared-candidate retry path so ordinary supported live workspaces can complete activation without closing agents, clearing state, or reinstalling a prepared release.
- Keep technical activation failures in diagnostics rather than the normal status line; preserve the exact restart notice only after durable restart readiness.
- Preserve execution identities, sessions, workspace order, outstanding interactions, and running progress across the app-window restart; new agents use the new release while existing agents stay on their retained execution release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `cli-self-update`: add explicit timeout-recovery and user-facing restart scenarios while retaining all existing activation and resident-continuity safeguards.

## Impact

Expected owners: release activation and automatic-update observation, native workspace/source continuity inspection, session update-status presentation, and their TypeScript/native tests. No bypass of certification, authenticated ownership, controller compatibility, release retention, or exact-target activation. No process shutdown, forced active-reference edits, data cleanup, or live-state mutation is authorized as a workaround.
