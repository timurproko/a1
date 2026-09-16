## Context

See `proposal.md` for motivation. Exact-package publication currently expands `package-install` into independently reported `package-contracts` and `package-startup` Vitest invocations. Both invoke `installExactCandidate`, so one lane performs two equivalent `npm install --global --ignore-scripts` operations and two fixture-root cleanup attempts. Hosted Windows evidence shows those installs consume about 97-127 seconds each under Defender, while the owners use the same candidate, platform, architecture, Node runtime, and install policy.

The owner split is still valuable for pull-request impact selection and result attribution. The solution therefore must remove repeated preparation without merging the owners, weakening their assertions, pre-warming measured startup state, or sharing mutable application roots.

## Goals / Non-Goals

**Goals:**

- Give the common validation runner ownership of one exact installed-package preparation per candidate/platform/runtime lane.
- Preserve independent package-contract and startup invocations and outcomes.
- Preserve direct focused execution of either test file outside the validation runner.
- Make preparation identity, consumers, duration, count, and cleanup observable and fail closed.
- Preserve fresh first-attempt startup state and all current platform/runtime coverage and budgets.

**Non-Goals:**

- Reducing the number of supported publication lanes or skipping either Windows runtime.
- Changing package contents, install scripts, startup budgets, test workloads, timeouts, retries, or publication permissions.
- Sharing preparation across jobs, runners, workflow attempts, candidates, Node runtimes, or operating systems.
- Introducing a persistent mutable installation cache.

## Decisions

### 1. The validation runner owns lane-scoped installation preparation

The tier plan will declare a preparation lifecycle when selected scopes consume the clean installed exact package. Before consumer invocations, the runner will install the verified candidate once into a runner-owned temporary prefix using the current install command and policy. It will perform the existing proxy synchronization needed by both consumers, record a receipt, and expose the prefix and receipt to child invocations through bounded environment variables.

The receipt will bind at least the candidate digest, package name/version, platform, architecture, Node version, install-policy identity, prefix, preparation count, and consuming scopes. The consumer helper will verify the receipt and candidate bytes before returning the shared prefix. Missing, stale, contradictory, or out-of-bound preparation will fail rather than trigger an unreported second install during an authoritative validation run.

Direct focused Vitest execution without runner-owned preparation will retain the current standalone install path. That fallback remains test-visible and cannot satisfy release evidence claiming deduplication.

**Alternatives considered:**

- Merge startup back into the package-contract test file. Rejected because it erases separate ownership and makes impact selection execute unrelated scenarios.
- Cache a global installation between workflow jobs or runs. Rejected because mutable cross-job state weakens exact-candidate identity and hermeticity.
- Copy the installed tree for each owner. Rejected because it replaces npm resolution time with another payload-wide copy and creates difficult mutation and cleanup semantics.

### 2. Consumers share only installed package bytes

Each consumer will still create an owner-specific temporary fixture root for working directories, configuration, data, runtime endpoints, release stores, process ownership, traces, and cleanup. The shared prefix is read-only after preparation. Existing proxy synchronization calls will become idempotence checks against the prepared installation rather than first-time mutations.

Startup receives no materialized release, certification, warmup, supervisor, profile data, or compile cache from package-contract execution. Its setup continues to create all of that state under its own fresh roots immediately before the measured scenarios. Package contracts likewise cannot use startup state as an oracle.

The validation runner will remove the shared preparation only after all consumers finish. Consumer cleanup never owns that prefix. On Windows, cleanup remains bounded and reports deferred disposition without replacing a prior owner failure.

**Alternative considered:** Let the first owner create and own the prefix. Rejected because later owners would depend on test ordering and the first owner's cleanup behavior.

### 3. Planning and evidence distinguish preparation from owners

The machine-readable tier plan and result will represent shared installation preparation separately from each consumer invocation. Regression tests will prove that selecting package-contracts and package-startup creates one preparation, two owner invocations, one final cleanup, and no hidden fallback install. Selecting either owner alone also creates only one preparation. Differing candidate or lane identities never reuse the receipt.

Phase evidence will retain current owner-specific timings and add preparation identity/count/duration and consumer scope membership. This makes the structural speedup reviewable even when hosted runner variance obscures wall-clock comparison.

**Alternative considered:** Rely only on elapsed-time improvement. Rejected because hosted variance cannot prove that duplicate work is absent.

## Risks / Trade-offs

- **[A consumer mutates shared package bytes]** -> Prepare proxy state before consumers, verify receipt/package identity at each handoff, add mutation rejection coverage, and keep consumer-specific writes outside the prefix.
- **[Standalone tests accidentally satisfy publication authority]** -> Mark fallback preparation as standalone and require the runner-owned receipt/count contract in authoritative validation results.
- **[Parent cleanup masks an owner failure]** -> Preserve the first owner failure and report cleanup as a separate passed/deferred/failed outcome.
- **[Shared preparation couples owner order]** -> Make the runner the sole preparation owner and test both individual and combined selections without declaring consumer-to-consumer dependencies.
- **[Extra receipt hashing erodes the gain]** -> Reuse the already verified candidate digest and inspect bounded identity files rather than hashing the complete installed dependency tree again.

## Migration Plan

1. Add the lane-scoped preparation/receipt lifecycle and focused identity/cleanup tests while retaining standalone fixture fallback.
2. Migrate package-contract and startup fixtures to consume verified shared preparation and owner-specific mutable roots.
3. Update validation planning, result evidence, suite-policy tests, and release workflow policy assertions.
4. Compare structural install counts and phase timings against the recorded pre-change hosted runs; retain every semantic scenario and supported lane.
5. Roll back by reverting the runner lifecycle and restoring owner-local installation; no persistent state or package migration is required.
