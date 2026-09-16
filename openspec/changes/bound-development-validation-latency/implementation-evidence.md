# Implementation evidence

## Authorization and baseline

The maintainer explicitly requested implementation with `apply this change`. Work continues in draft PR #434, branch `chore/bound-pr-validation-latency`, and worktree `D:/Git/a1/.worktrees/bound-pr-validation-latency`. This authorization is not final acceptance or merge authority.

PR #429 Development run `35096055623` is the primary baseline. The workflow took 16m45s; `Changed full-only integration owners` took 15m59s; selected-scope execution took 14m21s. `update-predecessor.integration.test.ts` took 834.568s, including 170.629s to install the candidate and 491.213s across three predecessor installs. PR #404 and PR #428 showed the same single-test critical path after setup reuse and impact-selection work.

## Implemented behavior

Integration registry/ownership/selection schemas now carry explicit `pull-request` or `exhaustive` cadence. Nine current owners are PR-eligible; only `update-predecessor` is exhaustive. Impact selection records affected exhaustive paths, conservative and manual Development select every PR owner, malformed cadence blocks, job resolution cannot activate a deferred owner, and aggregation rejects exhaustive evidence offered as a PR result.

Validation planning now runs explicit test selections in separately timed scope invocations while retaining one authenticated build/package preparation per job. Outcome and aggregate evidence report selected and deferred owners, setup/gate/scope/job time, aggregate processing, runner totals, maximum scope, runner critical path, and the eight-minute/five-minute target verdicts. Queue delay is not inferred inside a runner.

`evidence/development-validation-replay.json` records three deterministic selections: a PR #429-shaped invalidator, an ordinary release/update change, and a direct exhaustive-test change. Every scenario defers `update-predecessor` and retains focused predecessor tests. Its recorded PR #429 baseline is over both targets; the cadence-filtered structural replay is under both targets. The replay is explicitly not hosted acceptance evidence.

## Focused predecessor coverage audit

No PR-relevant deterministic gap was found, so no candidate-authored substitute for published predecessor code was added.

- `predecessor-command*.test.ts` covers asynchronous command completion, failure, output bounds, cancellation, process ownership, and lifecycle cleanup.
- `predecessor-fixture.test.ts` covers private-prefix installation, shipped synchronization, publication ordering, malformed registry metadata, shared deadlines, phase timing, cancellation, and failure-safe root ownership.
- `release-store.test.ts`, `dependency-layer.test.ts`, and `dependency-certification.test.ts` cover materialization identity, immutable payload/layer behavior, certification, concurrency, and failure.
- `warmup.test.ts`, `update-activation.test.ts`, `update-launch.test.ts`, and `update-transition.integration.test.ts` cover warmup, activation, launch ownership, rollback, blocker exit, and transition failure.
- Existing exact-package package/startup owners remain PR-eligible. The unchanged real test still imports each selected published release's own `materializeRelease` and `warmMaterializedRelease`, defaults to three predecessors, and remains in `full-release` with its existing 900s/1800s phase limits and no retry or installed-tree cache.

## Local validation

Dependencies were installed with `npm ci --ignore-scripts`; no local `test:fast`, `test:full`, `test:release`, publication, or interactive product command was run.

Final focused results:

- A worktree-inclusive conservative selector invocation chose all nine pull-request owners, deferred only `update-predecessor` with `exhaustive-cadence`, and reported fallback `invalidator`.
- The focused ownership, impact, resolver, aggregate, workflow, suite, tier, Full/release policy, documentation, timing, replay, predecessor fixture/command, materialization, and warmup command passed **263 tests across 26 files**.
- The focused update/materialization audit command passed **50 tests across 5 files**, with one existing platform-specific skip.
- `npm run typecheck` passed.
- `npm run check:architecture` passed architecture, product/package identity, pinned Pi provenance, and terminal-host provenance checks.
- `npm run check:docs-governance` passed.
- `npm run check:code-documentation:changed` passed.
- Strict active-change OpenSpec validation and `git diff --check` passed.

Earlier focused attempts remain debugging evidence: one aggregate fixture initially duplicated a shared requested/selected array while constructing forbidden exhaustive evidence, one runbook assertion expected the previous exact Node-24 sentence, and one resource-sensitive policy fixture omitted the new `scopes` evidence field. Each assertion was corrected to the new schema; no product assertion, workload, timeout, predecessor count, or retry policy was weakened.

## Hosted evidence status

The approved task requires one hosted manual Development dispatch against the implementation head using the new branch policy. It must record run/head/attempt, selected and deferred owners, every job result, runner critical path, maximum scope duration, and both target verdicts. That dispatch is pending the committed implementation head and is not inferred from the deterministic replay.
