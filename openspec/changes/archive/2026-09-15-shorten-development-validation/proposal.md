## Why

Recent successful development validation took about nine minutes, while a seven-and-a-half-minute startup job spent only about fifteen seconds in its six measured launches. Unconditional integration selection, serialized independent gates, repeated builds, and expensive package fixtures now dominate the feedback loop; optimizing those costs is safer than weakening startup budgets or retrying failures.

## What Changes

- Extend the existing complete-change impact selector to startup, package/recovery/resume, image/history, and cross-platform containment integration scopes using base/head dependency reachability and explicit dynamic/build invalidators. Changed tests and supporting fixtures always select their retained owners; uncertainty selects conservative coverage or blocks validation.
- Keep the complete ordinary fast tier, typecheck, architecture, and existing documentation/naming/rendering policies. Run the fast remainder, serialized resource-sensitive partition, and selected package integration independently on isolated runners rather than in one long Windows job.
- Split the current Windows Node 22 startup lane into independently owned startup and image/history compatibility checks. Extract unrelated package cleanup/recovery/layer scenarios from the startup timing scope, preserving their exact-package assertions and full-validation ownership.
- Reuse verified same-job builds and candidate packages; add the missing startup Rust cache and use integrity-checked dependency-download caches without restoring mutable test installations, certified releases, or performance evidence.
- Measure clean-install hooks, packing, materialization, certification/warmup, individual launches, shutdown, and fixture cleanup separately. Profile and optimize repeated immutable fixture work in the slow release-command, package-message-parity, and resume tests only where isolation and independent oracles remain intact.
- Preserve the single current-head required aggregate and all nightly/release/full-regression coverage, including Windows Node 22/24 and Linux/macOS. No timeout increases, new semantic retries, assertion removal, or production runtime changes.
- Evaluate a 2–3-minute ordinary-change feedback target and an under-five-minute startup-sensitive target as measured goals, not promised results or relaxed acceptance gates. If the complete representative observation set cannot be scheduled, preserve it as an explicit maintainer-accepted known gap rather than claiming the measurements were completed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Extend conservative impact selection to expensive integration scopes; require independently scheduled partitions, verified setup reuse, auditable suite ownership, and end-to-end feedback timing.
- `isolated-regression-testing`: Replace unconditional bundled PR startup coverage with impact-selected Windows Node 22 startup and compatibility scopes, retaining first-attempt exact-package guarantees, hermetic fixture boundaries, changed-test coverage, and complete non-PR validation.

## Impact

Implementation would affect `.github/workflows/ci.yml`, suite ownership in `config/validation-suites.json`, selector/aggregate/tier/package-preparation tooling under `scripts/release/`, focused governance tests, and the package-install/release-command/package-message-parity/resume fixtures. Full-regression and release composition may need mechanical owner remapping, not reduced coverage or changes to publication policy. Related implementation documentation belongs in the same change.

No public API, package dependency version, runtime behavior, branch protection, runner purchasing, nightly schedule, or supported platform changes are proposed. Existing startup-module plans and archived validation work are context, not authorization to implement them. PR #400's exclusive-file-handle failure and PR #402's predecessor/nightly recovery remain separate streams; this proposal is based on `origin/develop`, not either failing or pending branch.

Planning delivers only these OpenSpec artifacts. Implementation requires subsequent explicit approval and remains in this draft PR.
