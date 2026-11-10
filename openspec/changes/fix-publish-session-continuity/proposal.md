## Why

A long persisted session cannot resume because an authoritative UI snapshot exceeds the pending event queue's payload limit. The same failure is reproducible when an installed-update notice publishes that snapshot, so background release activation can abort work even though the process continues executing its original immutable release.

## What Changes

- Separate delivery accounting for authoritative transcript state from genuinely accumulated pending event payload, keeping finite resource bounds, event ordering, generation isolation, and asset lifetimes.
- Keep large-session startup and informational update notices outside exceptional overload recovery; neither may abort or replace the session merely because its accumulated transcript exceeds the queue budget.
- Add isolated regression fixtures for large persisted sessions and update observation, including subsequent interaction and the normal exit/resume command lifecycle.

## Capabilities

### New Capabilities

None; this repairs existing session and update guarantees.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define safe delivery of large authoritative snapshots and non-disruptive update announcements.
- `cli-session-resume`: Include large supported histories in ordinary restore guarantees.
- `cli-self-update`: Cover large-session continuity when local activation announces restart readiness.

## Impact

Primary ownership is `src/integrations/pi/engine`, with composition/update-observation and packaged resume regression coverage. No dependency upgrade, session-file migration, transcript truncation, hot-swapping, release publication, or changes to the seven-day release-retention policy are proposed. Personal session files remain read-only investigation inputs and must not become test fixtures.
