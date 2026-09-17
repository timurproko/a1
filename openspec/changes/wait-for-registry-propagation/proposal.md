## Why

The publisher verifies that the registry serves the uploaded bytes by polling the package metadata twelve times at five-second intervals, so it gives up sixty seconds after `npm publish` returns. npm now ingests a provenance-signed upload asynchronously and answers the publish with "Your package is being processed and may take a few minutes to become available." Release run 35257868835 published `0.1.8-dev.467` at 18:28:13Z, the registry first served it at 18:32:36Z, and the sixty-second window declared `0.1.8-dev.467 has not propagated` while the upload was intact. The failure also marks the `npm-publish` deployment failed on GitHub, and the operator has to inspect the registry by hand and rerun the failed jobs, which then pass on the same bytes.

## What Changes

- Poll the registry for up to ten minutes, at ten-second intervals, before declaring a publication failure; the publish job's twenty-minute timeout still bounds the run.
- Log each unsuccessful attempt with its reason so the wait is visible in the job log rather than sixty seconds of silence.
- Record in the runbook how to tell a propagation timeout from a bad publish and that rerunning the failed jobs verifies without republishing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: registry verification allows for npm's asynchronous ingestion window before failing.

## Impact

Implementation affects the "Verify the registry serves the validated bytes" step in `.github/workflows/release.yml` and the "When something fails" list in `docs/ci-release-runbook.md`. The digest and `dist-tag` checks, the pre-publish final registry check that turns a rerun into a no-op, and the stable tag, release, and `master` steps are unchanged.
