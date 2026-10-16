## Why

Trusted readiness promotes only all-checked task-list drafts, but the nightly Pi upstream sync still opens its `chore/pi-<version>` proposal with a plain-bullet `## Implementation` section that carries the version delta, the changelog excerpt, and the marker-bounded gate report. That body can never become a checklist, so a finished upgrade stays draft as a legacy body and never reaches finalization or CI unless a maintainer marks it ready by hand; `#783` (Pi 1.3.0) is the first proposal to need this. The regression triage had the same problem and was fixed by `regression-repair-checklist-body`.

## What Changes

- Generate the proposal body in the ordinary delivery layout: the proposal, four fixed unchecked implementation outcomes the reviewer checks as the work completes (resolve merge conflicts and kept-copy carry-over, adopt the public API delta, settle pending feature rows and inventory entries, and update stale pin mentions and release notes), one generated acceptance outcome naming the new pin, and the automation block.
- Move the version delta, changelog excerpt, and gate report out of the body into a sync report comment posted when the proposal opens and again on every later run, scheduled or refresh; the scaffold's design also records the opening report. The sync never edits the body after it opens, which retires the report markers and `refresh-pi-upgrade-body.mjs`.
- Keep readiness, finalization, branch ownership, skip, freeze, and refresh rules unchanged.
- Say in the delivery context, the CI runbook, and the toolchain guide that the generated outcomes are checked, never rewritten, and that the report lives in the comments.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: the nightly Pi upgrade proposal opens in the ordinary delivery layout with generated outcomes and reports its verdicts through sync report comments instead of the body.

## Impact

The change affects the Pi upgrade report renderer, its declaration file, the proposal script, the upstream sync workflow's open and re-run step, their tests, the delivery context in the OpenSpec configuration, the CI runbook, and the toolchain guide. It changes no readiness or finalization policy and no workflow permissions; the sync's App token already writes pull requests.
