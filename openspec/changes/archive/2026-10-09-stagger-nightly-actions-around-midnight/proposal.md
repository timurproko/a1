## Why

GitHub has recently created the repository's scheduled workflow runs roughly six to seven hours after their configured UTC times. The existing 01:23–04:23 UTC sequence therefore completes too late for morning development use, including delayed availability of the npm `next` development package.

## What Changes

- Move the four daily scheduled workflows into a staggered window centered on midnight UTC.
- Schedule Pi upstream sync at 23:23 UTC and Full regression at 23:47 UTC.
- Schedule nightly development publication at 00:17 UTC and OpenSpec archive reconciliation at 00:43 UTC.
- Preserve non-zero minute offsets, workflow ordering, dispatch triggers, validation, publication authority, and all workflow behavior outside the cron expressions and explanatory schedule comments.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Daily cadence and workflow behavior remain unchanged; this adjusts only the operational UTC trigger times.

## Impact

Only `.github/workflows/pi-upstream-sync.yml`, `.github/workflows/full-regression.yml`, `.github/workflows/publish.yml`, and `.github/workflows/openspec-archive.yml` change. GitHub scheduled events remain best-effort and may still start later than their configured times.
