# Design

## Problem

`assertStartupPerformanceBudget` is both the measurement oracle and the enforcement point. Every caller therefore gets the same verdict, so the only way to stop a development preview from failing on runner noise is to raise the number for everyone or to stop measuring. Neither is acceptable: the budgets in `a1-shell` describe real product intent, and the measurement is the only first-attempt startup evidence the project has.

## Decision

Split evaluation from enforcement in the owner, and move the enforcement decision to the caller that knows the channel.

- `evaluateStartupPerformanceBudget(evidence, budgets?)` performs the existing work — sort events, find the last `first-input-ready-render`, select the budget for the launch kind, compute dominant phase intervals — and returns a `StartupBudgetViolation` or `null`. A missing ready event stays a thrown error, because a launch that never became input-ready is a functional failure and not a timing observation.
- `formatStartupBudgetViolation(violation)` produces the exact message text used today, so the failing message, the recorded evidence, and the run summary all read identically.
- `assertStartupPerformanceBudget` becomes evaluate-then-throw and keeps its signature and message. Existing callers and its unit coverage are unaffected.

The exact-package startup gate reads `A1_STARTUP_BUDGET_ENFORCEMENT` once at module load. Any value other than `record` means `fail`, so an unconfigured local or third-party run keeps today's behavior and a typo cannot silently disable the gate.

## Channel assignment

| Channel | Mode | Reason |
| --- | --- | --- |
| Development publication (`release.yml`, `mode == 'develop'`) | `record` | A numbered preview is superseded by the next merge; blocking it on a shared-runner sample costs more than it protects. |
| Ordinary pull-request validation (`ci.yml`, `startup` group) | `record` | Same shared-runner noise, and the merge it gates is itself covered by nightly. |
| Nightly and stable publication (`release.yml`, other modes) | `fail` | Publication of a lasting artifact must hold the declared budget. |
| Full regression | `fail` | The explicit complete gate; stated explicitly rather than by default. |

Nightly runs every develop head within a day, so a genuine startup regression merged through a recording lane is still caught by a failing enforcement lane before it reaches a stable release.

## Evidence

`a1-startup-performance-evidence-v1` gains `enforcement` and `budgetViolations`; no existing field is renamed or removed, so existing readers keep working. The publication lanes upload the per-platform JSON next to the tier outcome, and a Windows-only summary step renders one row per measurement with its budget and status. A `::warning::` annotation makes an overrun visible on the run itself rather than only inside a downloaded artifact.

## Alternatives rejected

- **Raise the budgets to cover the observed noise.** A budget that accommodates a 4.5 s sample stops describing the product and cannot detect a real regression.
- **Retry the failed launch.** `isolated-regression-testing` forbids it, and a warmed retry measures a different thing.
- **Take the minimum of several samples.** More launches per lane make the slowest job slower, which is the other half of the reported problem.
