## Why

When a development publication fails, `npm run develop` dies with `Error: Command failed: gh run watch <id> --exit-status` and a Node stack trace from `publication-client.mjs`, naming neither the job nor the assertion that failed; the maintainer has to open GitHub and hunt. The workflow `Publication result` job is no better: it fails on `test "$VALIDATE" = success` and its summary says nothing about which lane or invocation was responsible. The run URL is also never printed, so following a run in progress means finding it by hand.

## What Changes

- Make the maintainer publication client print the run URL as soon as the run is known, and on failure gather the failed job names and their recorded failure messages into one bounded, readable error instead of the raw `execFileSync` stack trace.
- Make `npm run develop` report that error as a `[develop]` line and exit non-zero.
- Make the `Publication result` job write the failed jobs, non-zero validation invocations from uploaded lane evidence, and recorded startup budget violations to the run summary before applying the unchanged outcome requirement.
- Keep successful output, publication authority, and every gate unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Require readable failure reporting from the publication command and the result job without changing what decides the outcome.

## Impact

Implementation affects `scripts/release/publication-client.mjs`, `scripts/development/develop.mjs`, the `result` job of `.github/workflows/release.yml`, and the governance tests that pin the publication commands. It does not change publication authority, workflow triggers, gates, or the stable release path beyond the shared client failure report.
