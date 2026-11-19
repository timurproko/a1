# Startup validation cadence implementation evidence

## Accepted scope and baseline

Planning PR [#387](https://github.com/timurproko/a1/pull/387) merged at `e777a8c2`; the maintainer subsequently requested implementation. This stream starts from that merged `origin/develop` snapshot and does not include the separate archive or history-timeout corrections.

Before-change evidence: [PR #376 Development validation run 34851532347](https://github.com/timurproko/a1/actions/runs/34851532347), source `c19be32da7c855a07b9c0307f285a96aeea0a6b1`, created 2026-09-14 13:48:26 UTC.

| Startup lane | Job created | Started | Completed | Created-to-start | Execution | Result |
| --- | --- | --- | --- | --- | --- | --- |
| [Windows Node 22](https://github.com/timurproko/a1/actions/runs/34851532347/job/104000581071) | 13:48:53 | 13:48:59 | 13:54:51 | 6 seconds | 5m 52s | Success |
| [Windows Node 24](https://github.com/timurproko/a1/actions/runs/34851532347/job/104000581195) | 13:48:53 | 13:54:58 | 14:04:14 | 6m 05s | 9m 16s | Success |

These are GitHub job timestamps, not a claim about platform scheduler internals or a guaranteed saving. The overall baseline run failed an unrelated history timeout despite both startup lanes succeeding. It is timing/selection evidence only, not accepted implementation CI.

## Coverage ownership inspection

The `startup` job keeps its ID, `needs: changes`, code-only condition, and complete Node 22 steps. The protected aggregate continues to depend on `startup` and pass its actual result into `require-development-validation.mjs`.

The existing `full-release` plan was inspected without executing it (`node scripts/release/run-validation-tier.mjs full-release --plan`):

- Exact-package startup remains in the dedicated `vitest-package-install` invocation selected by `package-install`, consuming one exact candidate.
- Image preparation and image-worker package tests remain in the full non-isolated remainder; packaged-worker ownership is also declared in `dist-integration`.
- All current `test/features/prompt-history/*.test.ts` files remain in the full remainder except `store.test.ts`, which retains its existing one-file-at-a-time `vitest-fast-resource-sensitive` owner. The packaged history worker remains declared in `dist-integration`.
- Both Windows runtimes remain in Release and manual Full regression; nightly/stable select `full-release`, manual development publication retains `package-smoke` plus `package-install`.
- Defender, thresholds, package identity, schedules, publication dependencies, and the required aggregate helper need no change.
- The GitHub inventory records workflow triggers, permissions, authority, concurrency, and retention, not individual matrix values. Those governed fields remain unchanged; no inventory/settings mutation is needed.

## Local implementation verification

- The only workflow edit is `startup.strategy.matrix.node: [22, 24]` -> `[22]` in Development validation. Release, Full regression, suite definitions, aggregate helper, and governed inventory are unchanged.
- 75 focused tests passed across impact-aware workflows, required aggregate, Full regression, runbook, repository governance, release pipeline, and validation planning. Negative fixtures reject adding Node 24 back to PR startup, dropping Node 22/image/history coverage, skipping startup, or removing its aggregate dependency.
- The actual `full-release` plan still selects every current deferred startup/image/history file exactly once; package installation and resource-sensitive history retain their existing separate invocations.
- Typechecking, changed-file code-documentation governance, strict validation of this OpenSpec change, and `git diff --check` passed. No local fast/full/release tier, startup performance workload, or release publication was run.

## Remaining acceptance evidence

Current implementation-head CI, actual one-lane PR scheduling/timing, maintainer acceptance/manual merge authorization, and candidate-bound Node 24 full-validation evidence are pending. Local policy tests cannot establish those live outcomes. No release/full-regression workflow is dispatched as part of this implementation without separate authorization.
