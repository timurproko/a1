# Proposal

## Why

Development publication run 39112313180 failed for `0.2.7-dev.794` although both uploads succeeded. npm accepted `@timurproko/a1` at 08:55:12 UTC but served it only at 09:11:32, about 16.5 minutes later, while registry verification gives up after 60 polls at 10-second intervals (about 10 minutes). The run failed, so the published-pair smoke never ran for bytes the registry later served correctly.

## What Changes

- Poll the registry for about thirty minutes (180 attempts at 10-second intervals) before failing post-upload verification.
- Raise the publish job timeout so the longer window fits inside it.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `continuous-integration`: registry verification polls for at least thirty minutes before failing an upload npm is still ingesting.

## Impact

- **Script:** `scripts/release/npm-registry-verification.mjs` polling bound and its type declaration.
- **Workflow:** `.github/workflows/publish.yml` publish job timeout.
- No change to exact-byte comparison, dist-tag checks, upload steps, or rerun recovery.
