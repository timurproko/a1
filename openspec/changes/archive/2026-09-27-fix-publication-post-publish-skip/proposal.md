## Why

Development publication run [36329487925](https://github.com/timurproko/a1/actions/runs/36329487925) validated and published both `0.2.1-dev.599` packages, but GitHub skipped the required published-pair smoke matrix and completion job because the allowed documentation-review skip propagated through downstream jobs that lacked explicit status handling. The aggregate correctly failed, so the published bytes exist under `next` without a successful complete publication outcome.

## What Changes

- Make post-publication smoke evaluation explicit after allowed prerequisite skips by using always-evaluated job conditions with fail-closed direct dependency result checks.
- Apply the same explicit dependency handling to release completion so it runs only after successful package acquisition, publication, and published-pair smoke evidence.
- Add workflow-policy regressions that require these downstream conditions and prevent an allowed skipped documentation job from silently suppressing required publication work.
- Leave immutable `.599` bytes and its failed run unchanged; require a new numbered development candidate to publish and complete all native post-publication lanes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Allowed prerequisite skips no longer suppress required post-publication smoke or completion jobs after successful publication dependencies.

## Impact

- Changes `.github/workflows/release.yml` and focused release-pipeline governance tests.
- Does not change npm package bytes, package names, channels, validation matrices, publication credentials, stable tagging, or `master` movement.
- `@timurproko/a1@0.2.1-dev.599` and `@timurproko/a1-install@0.2.1-dev.599` remain immutable and available under `next`, but their failed aggregate is not reinterpreted as complete evidence.
- After implementation merges, `npm run develop` will derive a new preview from the corrective PR and GitHub Actions must publish and smoke-test that exact pair successfully.
