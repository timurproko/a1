## Context

See `proposal.md` for motivation and the two delta specs for the behavior contract.

PR #429 provides a clean post-optimization example. Its Development run lasted 16 minutes 45 seconds. The `Changed full-only integration owners` job lasted 15 minutes 59 seconds, and its selected-scope step lasted 14 minutes 21 seconds. Within that step, `update-predecessor.integration.test.ts` consumed 834.6 seconds; the other promoted tests and update-performance scope consumed about 25 seconds. Candidate installation took 170.6 seconds and three predecessor installations took 159.4, 192.8, and 139.0 seconds, so installation alone accounted for about 662 seconds.

The selection was not accidental. PR #429 changed `.github/workflows/ci.yml`, which is an explicit invalidator. Its impact artifact therefore selected conservative ownership and all ten integration owners, including `update-predecessor`, despite that owner's current `development: false` field. The same owner dominated PR #404 (about 12.1 minutes for the test and 14 minutes end to end) and PR #428 (about 13.9 minutes for the test and 16 minutes end to end).

The recent changes addressed different costs:

- PR #389 removed only the Windows Node 24 startup lane from Development; it did not alter predecessor validation.
- PR #404 parallelized owners and reused build/package prerequisites, but explicitly retained changed full-only owners and recorded that its 2–3-minute goal was unmet. Parallelism cannot shorten a critical path dominated by one serial 12–14-minute test.
- PR #428 bounded ordinary ownership, but validation-authority and unknown paths intentionally fall back to every owner. The `development: false` marker is descriptive only: conservative fallback, direct test changes, and coarse release ownership can still select that owner.

Nightly and Full regression already expand `full-release`, which includes `update-predecessor`. The expensive oracle can therefore change cadence without deletion or reduced Full/release coverage.

## Goals / Non-Goals

**Goals:**

- Make owner cadence executable policy rather than descriptive metadata.
- Keep conservative PR selection fail closed over every PR-eligible owner.
- Preserve the real three-predecessor exact-package oracle unchanged in Full/nightly/release validation.
- Make cadence deferral and per-scope latency visible and aggregate-safe.
- Demonstrate an ordinary conservative PR critical path at or below eight minutes, with no PR-required scope invocation above five minutes.

**Non-Goals:**

- Reducing the predecessor count, replacing published predecessor code with candidate-authored mocks, restoring mutable installations, or increasing timeouts.
- Making nightly results satisfy current-head PR checks.
- Changing supported Node/platform coverage, startup performance budgets, package identity, or publication authority.
- Moving every integration test to nightly; only explicitly classified exhaustive owners are excluded from Development.
- Promising queue latency, which is controlled by hosted runner availability rather than repository execution.

## Decisions

### 1. Replace the ambiguous development flag with an explicit cadence

Each integration owner will declare `cadence: "pull-request" | "exhaustive"`. All current owners except `update-predecessor` will initially be `pull-request`; `update-predecessor` will be `exhaustive`. Registry validation, generated ledgers, type declarations, fixtures, and policy tests will reject missing or unknown cadence.

A positive enum is preferred over preserving `development: false` because the current boolean has three incompatible interpretations: normally unselected, directly promotable, and conservatively selected. A separate allowlist was rejected because owner metadata and scheduling policy could drift.

### 2. Make conservative selection complete within the requested cadence

Development impact selection will produce two explicit sets:

- selected pull-request owners, which the modular matrix and protected aggregate require;
- deferred exhaustive owners, with a cadence reason and affected paths where applicable.

Impact mode selects affected pull-request owners. Conservative mode selects every pull-request owner. Neither mode schedules exhaustive owners. If cadence authority is malformed or cannot be loaded, selection blocks; it must not guess that an owner is safely deferred.

Full regression and nightly/stable release continue to expand the complete suite independently of Development impact selection, so they execute both cadence classes. Manual Development remains bounded to pull-request owners; maintainers request Full regression when they need pre-merge exhaustive evidence.

Running every owner and trying to optimize predecessor installations was rejected. The four npm installs alone consumed roughly eleven minutes in PR #429, and caching installed trees would violate fresh-prefix and mutable-state isolation. Splitting the promoted job was also rejected as the primary fix: it would improve labels but leave the predecessor test as the same critical path.

### 3. Preserve focused predecessor coverage in PRs without mislabeling it

The existing deterministic predecessor command, lifecycle, fault, fixture, materialization, warmup, package, and update tests remain under PR-eligible coarse ownership. Implementation will audit their coverage against the code paths used by the exhaustive fixture and add only focused hermetic cases needed to close an identified gap.

The impact record will never describe these tests as published-predecessor evidence. A direct edit to the exhaustive test or its support selects the focused contracts and records the exhaustive owner as deferred. This trades immediate real-history detection for bounded feedback while preserving source-level failures before merge and real-history detection in Full/nightly.

A one-predecessor PR smoke was rejected because it still requires candidate and predecessor installation, which would likely consume five to seven minutes by itself and violate the individual-scope target while providing an unstable subset of the three-release oracle.

### 4. Bind aggregation to selected PR owners and explicit deferrals

The integration selection schema and selection digest will include cadence. Job resolution will refuse to activate an exhaustive owner for a Development event. Aggregate validation will require exactly the selected pull-request owner outcomes and will reject:

- a missing or failed selected PR owner;
- an exhaustive outcome offered as a substitute;
- a selected owner reported as deferred;
- an unknown owner or cadence; or
- a deferred owner that is not declared exhaustive.

Skipped matrix envelopes remain acceptable only when current trusted selection excludes the job's pull-request owners. Deferred owners are evidence, not successful outcomes.

### 5. Report execution targets without creating a flaky wall-clock gate

Tier orchestration will retain shared build/pack preparation but emit owner/scope invocation durations rather than only one merged promoted-command duration. The aggregate summary will distinguish setup, scope execution, job elapsed time, aggregate overhead, and runner execution critical path. Queue delay will remain separately reported where the Actions API can establish it.

The acceptance evidence will replay at least:

1. a PR #429-shaped validation-authority change using conservative selection;
2. an ordinary owned release/update path; and
3. a direct exhaustive-test/support change.

The first two must show a runner execution critical path of at most eight minutes and every PR scope at most five minutes. The third must prove focused contracts are selected and the exhaustive owner is explicitly deferred. Full/nightly plan tests must prove the unchanged exhaustive scope remains present.

The timing target is an implementation acceptance condition, not a per-run semantic retry or a new product timeout. If hosted evidence misses the target, the result remains unmet and implementation must be refined or handed off with the gap; assertions and workloads are not reduced to manufacture a pass.

### 6. Bootstrap conservatively

The implementation PR itself changes validation authority. The currently deployed trusted policy may therefore run the old conservative selection once, including predecessor validation. No bootstrap exception or head-controlled bypass will be introduced. The bounded behavior becomes authoritative only after this policy is accepted and merged; subsequent invalidator PRs provide the live canary.

## Risks / Trade-offs

- **[A published-predecessor incompatibility can merge before nightly]** → Keep deterministic predecessor contracts in PRs, run the full oracle in Full/nightly/stable validation, block publication on failure, and document manual Full dispatch for high-risk release changes.
- **[Nightly may be delayed or already failing]** → Preserve failure visibility and publication blocking; do not claim nightly success from PR evidence.
- **[Cadence metadata could be used to hide expensive coverage]** → Require explicit enum validation, code review, ledger evidence, complete-suite ownership tests, and aggregate rejection of undeclared deferrals.
- **[Grouped invocation timing can obscure another slow scope]** → Record each owner/scope invocation separately while sharing immutable setup prerequisites.
- **[Hosted timing variance can exceed the target]** → Separate queue/setup/scope time, retain all attempts, use representative observations, and report the target as unmet rather than retrying or weakening tests.
- **[The implementation PR still takes the old long path]** → Accept the one-time trusted-base bootstrap cost; do not weaken existing authority to validate its own replacement.

## Migration Plan

1. Extend owner schema, generated evidence, and governance fixtures with explicit cadence while retaining complete-suite scope membership.
2. Update Development selection, job resolution, and aggregation to select all PR owners conservatively and report exhaustive deferrals.
3. Classify the published-predecessor owner as exhaustive; audit and strengthen focused deterministic PR contracts where needed.
4. Add per-owner/scope timing and replay evidence, then update workflow/runbook documentation.
5. Verify policy fixtures for impact, conservative, malformed, aggregate, Full, nightly, and stable paths; obtain hosted exact-head timing evidence before final acceptance.
6. Roll back by classifying the owner as `pull-request` again. Rollback restores the long PR gate without deleting tests, changing Full/release coverage, or reusing mutable fixture state.
