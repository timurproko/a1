## Implementation

- The publication caller jobs are now named `Develop` in `develop.yml`, `Candidate` in `release-candidate.yml`, and `Release` in `release.yml`.
- GitHub therefore lists called jobs as, for example, `Develop / Build process guardian (macos-15)` instead of `Validate and publish development packages / Build process guardian (macos-15)`.
- Only the `name:` line of each caller job changed. Job ids, inputs, secrets, permissions, conditions, and `publish.yml` are unchanged, and each workflow keeps its original line endings.

## Automated Evidence

- A new governance assertion in `full-regression-policy.test.ts` pins the three caller names for every job that calls `publish.yml`.
- Focused publication governance coverage passed: 4 files, 58 tests, covering the full-regression, release-pipeline, CI release runbook, and publication-client policies.
- Strict OpenSpec validation passed for `short-publication-caller-names`.

## Known Gaps

GitHub always prefixes called jobs with the caller job name, so the short prefix remains. The rendered names are confirmed by the next publication run, not locally.
