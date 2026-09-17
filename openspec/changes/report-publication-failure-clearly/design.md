# Design

## Client failure report

`dispatchPublication` wraps `gh run watch --exit-status`. On failure it asks the Actions API for the run jobs, keeps the ones whose conclusion is `failure`, reads each job check-run annotations, and keeps the `failure`-level messages that are not the generic `Process completed with exit code N`. The first line of each message is enough; the full text is in the run. The list is deduplicated and capped at ten lines so a cascading failure does not flood the terminal. The thrown error reads `publication run <id> failed in <jobs>` followed by one indented line per message.

Annotations are used instead of grepping the failed log because they are exactly the error and warning lines the steps emitted, already deduplicated by GitHub, and available for a job the moment it finishes. This also surfaces recorded startup budget overruns from the record-mode gate, which are warnings rather than failures but are the most likely context a maintainer wants.

Every `gh` call in the client goes through the module `run` helper, and `dispatchPublication` now accepts an injectable runner so the failure path can be driven by a fake in tests without contacting GitHub.

## Entry point

`develop.mjs` catches the error from `main`, prints `[develop] <message>`, and sets `process.exitCode = 1`. The governance pin that forbids `process.exit` is narrowed to forbid the abrupt call `process.exit(`; setting the exit code is how `release.mjs` already reports failure. The stable release path shares the client and gains the same report through its existing error handling.

## Result job summary

The `result` job gains one informational step, run first with `if: always()`, that lists failed jobs from the Actions API, downloads the `release-validation-<version>-*` artifacts, and prints each lane's non-zero invocations (`id`, exit code, command) and any `budgetViolations` from `startup-<platform>.json`. The existing `Require the selected outcome` step is unchanged and still decides the job result. Downloading the artifacts needs no new permission; reading jobs uses the workflow token's default read access.
