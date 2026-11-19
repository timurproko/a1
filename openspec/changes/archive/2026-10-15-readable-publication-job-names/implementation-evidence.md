## Implementation

- The six publication matrix jobs now use static names: `Build process guardian`, `Build terminal host`, `Validate sequential`, `Validate Windows shard`, `Reconstruct Windows lane`, and `Published pair`.
- GitHub appends each expanded entry's matrix values in parentheses, so running lanes still identify platform, runner, Node version, and shard. Skipped jobs now show only the readable name instead of a raw `${{ matrix.* }}` template.
- Job ids, conditions, dependencies, matrices, steps, artifacts, and the publication aggregate are unchanged.
- Regression lane detection in `scripts/release/propose-regression-fix.mjs` still resolves suffixed names such as `Validate Windows shard (win32-node24, windows-2025, 24, core)` to `win32-node24`, because the platform value remains in the name.

## Automated Evidence

- A new governance assertion in `full-regression-policy.test.ts` pins the six static names and rejects any `matrix.` reference in publication matrix job names.
- The published-pair naming assertion in `release-pipeline-policy.test.ts` now expects the static name and still rejects `matrix.label`.
- Focused publication workflow governance coverage passed: 5 files, including the full-regression, release-pipeline, environment-probe, integration-owner-registry, and validation-receipt workflow policies.
- Strict OpenSpec validation passed for `readable-publication-job-names`.

## Known Gaps

GitHub still lists skipped jobs. It offers no way to hide a job whose condition is false, so this change makes those rows readable rather than removing them. The rendered names are confirmed by the next publication run, not locally.
