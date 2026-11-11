## Why

A long persisted session cannot resume because an authoritative UI snapshot exceeds the pending event queue's payload limit. The same failure is reproducible when an installed-update notice publishes that snapshot, so background release activation can abort work even though the process continues executing its original immutable release.

## What Changes

- Separate delivery accounting for authoritative transcript state from genuinely accumulated pending event payload, keeping finite resource bounds, event ordering, generation isolation, and asset lifetimes.
- Keep large-session startup, model selection, and informational update notices outside exceptional overload recovery; none may abort or replace the session merely because its accumulated transcript exceeds the queue budget.
- Add isolated regression fixtures for large persisted sessions and update observation, including subsequent interaction and the normal exit/resume command lifecycle.
- Coordinate recovery with actual command settlement, preserve applied-operation outcomes, and retain bounded classified diagnostics without private content.
- Prevent takeover from live session writers and release ownership on runtime construction failure and disposal.
- Protect executing release roots and dependency layers using process-lifetime claims, retaining legacy and uncertain owners conservatively.

## Capabilities

### New Capabilities

None; this repairs existing session and update guarantees.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define safe delivery of large authoritative snapshots and non-disruptive update announcements.
- `cli-session-resume`: Include large supported histories in ordinary restore guarantees.
- `cli-self-update`: Cover large-session continuity when local activation announces restart readiness.

## Impact

Primary ownership is `src/integrations/pi/engine`, with composition/update-observation and packaged resume regression coverage. The maintainer approved the full incident-audit scope, including writer safety, recovery, diagnostics, and process-lifetime protection as an exception to age-only release retention. No dependency upgrade, session-file migration, transcript truncation, hot-swapping, or release publication is included. Personal session files remain read-only investigation inputs and must not become test fixtures.
