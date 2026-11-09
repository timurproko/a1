# Proposal

## Why

Bare A1 persists session names but never publishes them through its existing terminal-title port, so supporting hosts can retain stale launcher titles such as `npm root`. The session name should identify the running session without a user extension or a terminal-host-specific integration.

## What Changes

- Publish the current authoritative session name, normalized to safe single-line text, as bare A1's terminal title; use the product display name `a1` when no usable name exists.
- Refresh the session view for Pi's public `session_info_changed` event, including name changes outside the owned `/name` command.
- Synchronize the title after terminal startup, session-view/name changes, and presenter activation, deduplicating unchanged core titles.
- Preserve extension `ctx.ui.setTitle()` overrides across unrelated updates and keep automatic title writes out of the pinned `a1 pi` comparison profile.
- Retain the existing active-presenter ownership boundary, including activation/reattachment tests, without adding resident sessions or tabs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `a1-shell`: Add bare-A1 session-derived terminal-title behavior, safe text normalization, title ownership, and comparison-profile compatibility.

## Impact

- Production owners: `src/integrations/pi/engine/session-events.ts` and `src/app/session-shell/session-shell.ts`; existing session view and presentation contracts remain sufficient.
- Tests: engine event/view projection, shell workflows/lifecycle, host attachment ownership, extension override coexistence, and title recording in the neutral terminal double.
- No new dependencies, settings, persistence formats, launcher behavior, direct OSC writes, or Herdr/Claude Code changes.
- The supplied plan's resident-tab scenarios are adapted to the existing host/presenter test seam. Current `develop` explicitly prohibits a production resident host or tab strip; this change does not restore either.

## Delivery

This draft contains planning artifacts only. Implementation requires explicit maintainer plan approval and an implementation request, and will continue in the same branch, worktree, and pull request.
