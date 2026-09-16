# Validation ownership and evidence

Development validation computes one exact base/head selection with:

```bash
npm run select:validation-impact -- --base <full-base-sha> --head <full-head-sha> --output .artifacts/validation/impact.json
```

The versioned `config/validation-ownership.json` registry maps stable product and test path groups to a mandatory PR core, affected unit tests, resource-sensitive tests, and integration owners. The initial coarse owners are UI/rendering, launch/startup, release/package/update, Pi, native containment, image/history, governance, and shared product inputs. Each integration owner in `config/integration-owners.json` declares `pull-request` or `exhaustive` cadence. A changed pull-request test selects its owner; a changed exhaustive test selects focused deterministic contracts and records the exhaustive owner as cadence-deferred. Shared support selects every declared PR consumer and records affected exhaustive consumers; copies, renames, and deletions inspect both identities. Reasons and changed paths are recorded in `impact.json`.

Unknown operational inputs, unavailable comparison history, workflow/selector/suite/aggregate changes, and manual Development dispatch select every pull-request owner. Missing, malformed, or unknown cadence blocks instead of guessing. Documentation-only and version-only changes retain explicit exemptions. Selection does not require whole-repository source parsing.

## Commands and coverage levels

The public complete commands remain unchanged:

```bash
npm run test:pr-core               # mandatory type/architecture checks and bounded smoke tests
npm run test:fast                  # typecheck, changed docs, complete fast composition
npm run test:scope -- <scope...>   # named atomic scopes
npm run test:full                  # complete deduplicated local composition
npm run test:release               # release gates; publication authority is unchanged
```

`test:pr-core` is not a replacement for `test:fast`: CI combines it with directly changed and coarse-owner tests from the exact impact selection. Selected resource-sensitive tests run independently on an isolated Windows runner. Selected package, startup, rendering, Pi, compatibility, and platform owners also run independently after their actual prerequisites.

Conservative Development retains every pull-request owner but does not schedule exhaustive owners. Full regression and nightly/stable release retain both cadence classes and declared Windows Node 22/24, Linux Node 24, and macOS Node 24 coverage. The real three-release `update-predecessor` exact-package oracle is exhaustive; deterministic predecessor command, fixture, materialization, warmup, package, and update contracts remain PR-eligible. Preview and release continue to consume exact candidate bytes under their channel-specific contracts. Use manual Full regression before merge when a risky release change needs real published-history evidence. The generated ownership ledger command is:

```bash
node scripts/release/generate-validation-ownership-ledger.mjs --output .artifacts/validation/ownership-ledger.json
```

## Failed-job reruns and attempt evidence

Every modular outcome, content-free job envelope, and uploaded artifact name is qualified by `github.run_attempt`. Authority remains bound to the workflow run ID, exact head, complete selection identity, logical job, and platform/runtime target.

For GitHub's explicit **re-run failed jobs** action, a successful job that GitHub did not rerun may be reused only from an earlier attempt of that same run/head/selection. A job executed in the current attempt must use its current outcome; failure, cancellation, malformed evidence, duplicate authority, or missing evidence blocks the aggregate. No result is reused across commits, workflow runs, or changed selections. The aggregate lists each reused job and original attempt. Workflows do not automatically retry semantic assertions or performance failures.

## Receipts and artifact boundaries

Checkout-bound type, architecture, governance, unit, and smoke outcomes bind head/run/selection/scope authority without inventing package identity. Build and package receipts remain mandatory wherever validation consumes emitted or packed bytes: package, startup, update, compatibility, preview, release, and publication boundaries.

A build receipt binds checkout head, complete build inputs, toolchain, emitted files, and native artifacts. A package receipt additionally binds exact tarball bytes, packed entries, manifest/bin identity, producer, and verified build/source authority. `VALIDATION_BUILD_READY` and `VALIDATION_CANDIDATE_TARBALL` only locate prerequisites; stale or tampered receipts cause fresh preparation or failure.

Npm download bytes may be reused with integrity checks and `--prefer-offline`, with normal network fallback. Every installation prefix remains fresh. Installed package trees, dependency certification, startup/profile state, mutable fixture repositories, passing outcomes, and publication evidence are never restored from caches.

## Startup budget enforcement

The exact-package startup gate always measures both profiles and all three launch kinds on the first attempt and never retries a measurement. `STARTUP_BUDGET_ENFORCEMENT` decides only what a timing overrun does:

| Value | Where | Effect |
| --- | --- | --- |
| `record` | Development publication (`release.yml` with `mode == 'develop'`) and the pull-request `startup` group in `ci.yml` | Keeps the measurement, appends the violation to the evidence, emits a `::warning::` annotation, and lets the run succeed. |
| `fail` | Nightly and stable publication, and Full regression | Throws the same message as before and blocks publication. |

Any absent, empty, or unrecognized value means `fail`, so a local run and a misspelled channel both keep enforcing. A launch that records no input-ready frame fails in either mode, because that is a functional failure rather than a timing observation.

`STARTUP_PERFORMANCE_RESULT` names the `a1-startup-performance-evidence-v1` file. It carries `enforcement`, `budgetViolations`, and one measurement per profile and launch kind with its `elapsedMs` and `budgetMs`. Publication lanes upload it as `release-validation-<version>-<platform>` next to the tier outcome and render it as a table in the run summary.

The budget numbers themselves live in one place, `src/foundation/startup/startup-budget.ts`, and are declared by the `a1-shell` capability. Do not restate them in a workflow.

To make development publication enforce budgets again, set `STARTUP_BUDGET_ENFORCEMENT: fail` in the `release.yml` validation step; rollback must not remove the measurement, the evidence fields, or the nightly and Full regression enforcement.

## Evidence inspection

Download these artifacts from the exact workflow run:

- `development-validation-impact`: base/head, global selection identity, PR-core tests, selected pull-request owners, cadence-deferred exhaustive owners, exclusions, and bounded reasons.
- `development-validation-outcome-<job>-<platform>-node<node>-attempt-<attempt>`: attempt-qualified outcome, content-free envelope, per-scope authority and duration, and applicable exact-artifact evidence.
- `development-validation-aggregate-<head>-<run>-<attempt>`: selected/deferred owners, accepted/reused attempts, evidence count, runner critical path, total runner time, aggregate processing, setup/gate/scope time, cache state, and invocation count. It reports the eight-minute critical-path and five-minute individual-scope targets as met or unmet; hosted queue delay is not test execution and remains separate.
- startup/resume phase JSONL and performance JSON: first-attempt launch evidence and retained failed setup/readiness records.

A finalized version-3 PR keeps its phase-free body unchanged. Its ordinary exact-head workflow runs selected product/governance lanes and `Finalized delivery validation` in parallel, then emits the stable protected `Development validation required` aggregate only when both authorities succeed. Green CI enables maintainer review and manual merge but does not claim human acceptance or merge automatically. No lifecycle body edit or second workflow run is required. Any implementation commit changes the head and reruns applicable validation; any body change reruns finalized-record validation and must continue to match the committed manifest. Legacy acceptance-record-only PRs retain their separate trusted `Acceptance record validation` route. Queue availability remains explicitly unavailable inside a runner and is calculated from the Actions API during final run analysis rather than guessed.

## Rollback

To disable selective execution without reducing PR coverage, use manual Development dispatch or force conservative ownership selection. To restore the historical predecessor oracle to every applicable PR, change its cadence from `exhaustive` to `pull-request`; do not delete it from Full/nightly/release. To disable prior-attempt reuse, require all accepted attempts to equal the aggregate attempt; this must not remove attempt-qualified artifacts or failure visibility. To disable prerequisite reuse, unset readiness/tarball variables and receipt paths so tier orchestration rebuilds and repacks.

Rollback must retain every test, startup budget, zero automatic retry policy, platform/runtime lane, exact-package identity, resource isolation, complete fast/full/release compositions, and the single stable protected-branch aggregate.
