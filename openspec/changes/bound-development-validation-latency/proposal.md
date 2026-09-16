## Why

Recent validation work reduced duplicated setup and introduced impact selection, but it did not bound the pull-request critical path. PR #429 still took about 17 minutes because changing `.github/workflows/ci.yml` triggered conservative selection and the 13.9-minute published-predecessor test, even though that exhaustive historical compatibility gate already runs in Full regression and nightly/release validation.

## What Changes

- Define explicit pull-request and exhaustive execution classes for retained integration owners so conservative PR fallback means all PR-eligible coverage, not every nightly/release-only gate.
- Move the exhaustive multi-release published-predecessor scenario out of ordinary `pull_request` validation while retaining it unchanged in manual Full regression and nightly/stable release validation.
- Keep focused deterministic predecessor protocol/fixture coverage and affected package/update owners in PR validation, including for validation-authority and unknown-path changes.
- Add selection and aggregate contracts proving that scheduled-only owners cannot lengthen the ordinary PR critical path or be mistaken for missing required evidence.
- Add owner/scope timing evidence and acceptance baselines with an ordinary PR target of at most eight minutes of execution after scheduling and no individual PR-required scope invocation above five minutes; report an unmet target instead of weakening assertions or retrying.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Distinguish bounded PR-required coverage from exhaustive scheduled/full coverage, preserve fail-closed selection within each cadence, and make the PR latency target auditable.
- `isolated-regression-testing`: Assign real multi-predecessor compatibility to exhaustive validation while retaining focused PR coverage and the complete historical oracle outside ordinary PRs.

## Impact

Affected areas include Development/Full/nightly workflow selection, integration-owner and suite registries, modular aggregate authority, predecessor regression ownership, validation timing evidence, governance tests, and validation documentation. Product runtime behavior, package formats, supported platforms/runtimes, startup budgets, release publication authority, and the exhaustive predecessor assertions are unchanged.
