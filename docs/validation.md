# Validation ownership and evidence

Development validation computes one exact base/head selection with:

```bash
npm run select:validation-impact -- --base <full-base-sha> --head <full-head-sha> --output .artifacts/validation/impact.json
```

The versioned `config/validation-ownership.json` registry maps stable product and test path groups to a mandatory PR core, affected unit tests, resource-sensitive tests, and integration owners. The initial coarse owners are UI/rendering, launch/startup, release/package/update, Pi, native containment, image/history, governance, and shared product inputs. A changed retained test selects its owner; shared support selects every declared consumer; copies, renames, and deletions inspect both identities. Reasons and changed paths are recorded in `impact.json`.

Unknown operational inputs, malformed policy, unavailable comparison history, workflow/selector/suite/aggregate changes, and manual Development dispatch select complete applicable coverage. Documentation-only and version-only changes retain explicit exemptions. Selection does not require whole-repository source parsing.

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

Conservative Development, Full regression, nightly, preview, and stable release retain complete tests and declared Windows Node 22/24, Linux Node 24, and macOS Node 24 coverage. Preview and release continue to consume exact candidate bytes under their channel-specific contracts. The generated ownership ledger command is:

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

## Evidence inspection

Download these artifacts from the exact workflow run:

- `development-validation-impact`: base/head, global selection identity, PR-core tests, integration decisions, exclusions, and bounded reasons.
- `development-validation-outcome-<job>-<platform>-node<node>-attempt-<attempt>`: attempt-qualified outcome, content-free envelope, scope authority, gate durations, and applicable exact-artifact evidence.
- `development-validation-aggregate-<head>-<run>-<attempt>`: selected owners, accepted/reused attempts, evidence count, critical path, runner time, setup/gate time, cache state, and invocation count.
- startup/resume phase JSONL and performance JSON: first-attempt launch evidence and retained failed setup/readiness records.

A finalized version-3 PR stays in `Phase: Implementation`. Its ordinary exact-head workflow runs selected product/governance lanes and `Finalized delivery validation` in parallel, then emits the stable protected `Development validation required` aggregate only when both authorities succeed. Green CI enables maintainer review and manual merge but does not claim human acceptance or merge automatically. No phase edit or second workflow run is required. Any implementation commit changes the head and reruns applicable validation; any body change reruns finalized-record validation and must continue to match the committed manifest. Legacy acceptance-record-only PRs retain their separate trusted `Acceptance record validation` route. Queue availability remains explicitly unavailable inside a runner and is calculated from the Actions API during final run analysis rather than guessed.

## Rollback

To disable selective execution without reducing coverage, use manual Development dispatch or force conservative ownership selection. To disable prior-attempt reuse, require all accepted attempts to equal the aggregate attempt; this must not remove attempt-qualified artifacts or failure visibility. To disable prerequisite reuse, unset readiness/tarball variables and receipt paths so tier orchestration rebuilds and repacks.

Rollback must retain every test, startup budget, zero automatic retry policy, platform/runtime lane, exact-package identity, resource isolation, complete fast/full/release compositions, and the single stable protected-branch aggregate.
