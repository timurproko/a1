## 1. Shared Preparation Command

- [ ] 1.1 Add an exported shared-preparation operation to `scripts/release/validation-tier.mjs` that verifies the existing build and package receipts, performs exactly one exact-package installation for the planned consumers, and returns the receipt, installed prefix, and handoff environment; verify it fails closed when the selection plans no exact-package preparation or when either receipt is missing, stale, or contradictory.
- [ ] 1.2 Add the `--prepare-exact-package --handoff <path>` entry point to `scripts/release/run-validation-tier.mjs`, writing one bounded handoff document and running no other command; verify the written document names its schema, consumers, prepared paths, measured duration, and the verified receipt.

## 2. Handoff Consumption

- [ ] 2.1 Add an exact-package handoff option to `runTierPlan` and the matching `--exact-package-handoff <path>` flag; verify that without the flag the lazy preparation path is byte-for-byte unchanged for local runs and pull-request CI.
- [ ] 2.2 Verify a consumed handoff with the existing exact-package verification before the invocation loop and record its outcome as a shared preparation with the duration measured by the preparing command; verify each consuming owner still verifies the installation before and after its own invocation and still reports a separate result.
- [ ] 2.3 Reject a malformed, plan-contradicting, or unverifiable handoff with one clear failed preparation outcome and no second installation; verify the run stops before any owner executes and that cleanup of a received root still happens at the end of the run.

## 3. Workflow Order

- [ ] 3.1 Reorder the `release.yml` validation job to prepare the exact package before enabling Defender and to pass the handoff to validation; verify the Defender step body is unchanged and that dependency installation and candidate extraction no longer run under enabled real-time protection.
- [ ] 3.2 Apply the same order to the `full-regression.yml` regression job; verify it still packs exactly once and still runs the complete tier.
- [ ] 3.3 Update the governance pins that assert Defender precedes `npm ci` so they assert the new order instead, and add tier coverage for a written handoff, a consumed handoff, and a rejected handoff; verify `npx vitest run test/repository-governance` reports no new failure.

## 4. Specifications And Evidence

- [ ] 4.1 State in `isolated-regression-testing` that protection is required before the first packaged launch and may be disabled during dependency installation and candidate extraction; verify the `defender-prerequisite` proof and the unchanged budgets remain required.
- [ ] 4.2 Define the prepare and handoff contract in `continuous-integration`, including one preparation per lane, verification before use, and fail-closed rejection; verify the existing deduplication requirement stays consistent with it.
- [ ] 4.3 Run focused tier, governance, and workflow tests plus typechecking and record the exact commands and outcomes; measure the resulting `exact-package-preparation` duration from the first exact-head publication run and record it as post-merge evidence.
