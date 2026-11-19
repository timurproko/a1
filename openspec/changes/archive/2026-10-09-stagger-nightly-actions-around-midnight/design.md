## Context

The repository has four independent daily schedules: Pi upstream proposal discovery, Full regression, nightly development publication, and OpenSpec archive reconciliation. Their current UTC trigger times span 01:23 through 04:23. Recent GitHub scheduler delays have shifted actual publication starts into the late UTC morning.

## Goals / Non-Goals

**Goals:** start the nightly sequence about three hours earlier; keep expensive workflows staggered; avoid the high-contention top of the hour; and preserve every existing workflow input, permission, condition, and authority boundary.

**Non-Goals:** guaranteeing exact execution time; adding an external scheduler or retry mechanism; changing daily cadence; coupling workflows that are currently independent; or changing validation, publication, synchronization, or merge behavior.

## Decisions

### Use a staggered midnight UTC window

The schedules will be:

- Pi upstream sync: `23 23 * * *`
- Full regression: `47 23 * * *`
- Nightly development publication: `17 0 * * *`
- OpenSpec archive reconciliation: `43 0 * * *`

This preserves distinct non-zero minute offsets and keeps the two expensive validation paths separated by 30 minutes. The sequence crosses the UTC date boundary intentionally.

### Treat cron as best-effort

GitHub does not guarantee that scheduled events begin at the configured minute. The change advances the requested times but does not claim that runs will execute at midnight or complete by a fixed deadline. Strict delivery-time guarantees would require an external dispatcher and are outside this change.

### Keep workflow behavior unchanged

No trigger other than each `schedule` cron changes. Manual dispatch, pull-request events, workflow calls, permissions, concurrency, source selection, validation matrices, publication gates, and reconciliation behavior remain intact.

## Risks / Trade-offs

- A delayed GitHub event can still start hours after the configured time.
- Pi sync and Full regression execute on the previous UTC date relative to publication and archive reconciliation, although their daily cadence is unchanged.
- Local wall-clock time varies with daylight saving because GitHub cron is UTC.

## Planned Evidence

Validate the active OpenSpec change strictly, parse all four workflow files as YAML, and add or update focused workflow schedule assertions if repository governance already treats cron values as an enforced contract.
