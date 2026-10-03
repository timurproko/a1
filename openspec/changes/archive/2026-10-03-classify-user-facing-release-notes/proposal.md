## Why

Generated stable notes currently expose automated validation repair work as user-facing fixes while treating Pi runtime upgrades as generic chores. Users should see product changes and dependency upgrades, not the repository mechanics used to keep CI healthy.

## What Changes

- Exclude non-breaking `chore(...)` pull requests and generated regression-triage repairs from generated stable release notes.
- Give newly generated regression-triage pull requests the `chore(regression): ...` title classification; if investigation finds a user-visible product defect, require the final pull request to be retitled to the applicable `fix(scope): ...` before merge so it remains visible.
- Give Pi upgrade pull requests the `upgrade(pi): ...` title classification and render upgrades under `Changed`, while retaining compatibility for already-merged `chore(pi): upgrade ...` pull requests.
- Preserve explicit breaking changes regardless of their ordinary type and emit a neutral no-user-facing-changes entry when every pull request in a release range is filtered.
- Keep the trusted `fix/nightly-regression-*` and `chore/pi-*` branch identities, generated change identifiers, validation selection, release approval, and human editing of draft Release notes unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Classify generated release-note entries by user impact, give automated regression and Pi upgrade proposals appropriate release semantics, and preserve breaking and historical upgrade behavior.

## Impact

The change affects deterministic release-note rendering, regression-triage and Pi-sync pull-request titles, title-normalization compatibility, focused repository-governance tests, and release operator documentation. It does not mutate the current draft Release, rename established automation branches, alter stable-version selection, or change which validation suites a pull request receives.
