## Why

The generated post-publication reopening PR changes only the three synchronized package versions and adds the already-published release note, but the generic `version-only` classifier rejects the added note. PR #706 therefore selected the ordinary package, startup, compatibility, rendering, terminal-host, and integration lanes even though trusted release automation and documentation auto-merge independently verify the exact reopening content. This spends the full development-validation budget without adding evidence relevant to the change.

## What Changes

- Add a distinct Development validation route for an exact post-publication release reopening, using trusted base policy and current pull-request metadata rather than broadening the path-only `version-only` exemption.
- Reuse the existing release-reopening identity, path, manifest, published-Release, and note-content verification before granting the route.
- For a verified reopening, skip dependency installation, generic impact selection, naming/documentation scans, product builds, rendering, and modular product tests while retaining current-head route verification, PR Full regression selection, and the protected `Development validation required` aggregate.
- Require the aggregate to accept skipped product lanes only when the verified reopening route is present for the exact head; failed, stale, malformed, or unavailable verification receives no exemption and falls back to ordinary validation or blocks.
- Add focused policy, workflow, and aggregate regressions for accepted reopening PRs and fail-closed lookalikes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Give exactly verified post-publication release reopening PRs a lightweight, current-head-bound validation route instead of unrelated product validation.

## Impact

Development validation readiness/routing, `.github/workflows/ci.yml`, the protected aggregate policy, and focused repository-governance tests change. Release publication, reopening construction, documentation auto-merge eligibility, branch protection, and validation for ordinary version changes remain unchanged.
