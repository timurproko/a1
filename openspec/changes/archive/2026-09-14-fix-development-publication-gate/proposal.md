## Why

Development publication run `33638818217` built exact package `0.1.8-dev.212` and passed Windows Node 22/24, macOS Node 24, and Linux Node 24, yet GitHub skipped the npm publisher because its intentionally skipped documentation prerequisite triggered the job-level implicit success guard. The final result correctly failed on `PUBLISH=skipped`, so explicit development publication cannot currently publish any otherwise valid preview.

## What Changes

- Make the npm publisher evaluate its explicit prerequisite predicate even when the optional development documentation job is intentionally skipped.
- Preserve fail-closed publication requirements: a newly built candidate still requires successful package construction, all exact-package platform validation, and documentation success or an explicitly permitted skip.
- Add focused workflow-policy regression coverage proving development publication proceeds after the permitted documentation skip while actual package, validation, or required documentation failures still block it.
- Re-run `npm run develop` only after the correction merges, requiring one newly numbered exact package to pass every configured platform lane, publish to npm `next`, and satisfy the aggregate publication result.
- Keep package bytes, validation scope, npm provenance, workflow concurrency, release environment, registry verification, and stable/nightly documentation requirements unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The existing `continuous-integration` capability already requires verified preview bytes to publish through the sole release workflow. This change repairs workflow orchestration so it satisfies that contract; it does not alter the requirement.

## Impact

- Affected workflow: `.github/workflows/release.yml` publisher job scheduling.
- Affected evidence: release workflow governance/policy tests and the post-merge exact-package publication run.
- No production source, public API, dependency, package payload, terminal behavior, color environment, validation selection, or installed Pi package changes.
- Package `0.1.8-dev.212` remains unpublished; the repaired authoritative `develop` commit will derive a new immutable preview number from its own merged pull request.
