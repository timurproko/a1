## 1. Budget Owner

- [ ] 1.1 Add `StartupBudgetViolation` and `evaluateStartupPerformanceBudget` to `src/foundation/startup/startup-runtime.ts` containing the current sort, ready-event, budget-selection, and dominant-phase logic; verify a missing input-ready render still throws in both modes and no budget number changes.
- [ ] 1.2 Add `formatStartupBudgetViolation` and reimplement `assertStartupPerformanceBudget` as evaluate-then-throw; verify the thrown message text, signature, and default budgets are unchanged.
- [ ] 1.3 Extend `test/foundation/startup/startup-runtime.test.ts` with evaluation and formatting cases; verify the violation object carries profile, launch kind, elapsed, budget, dominant phases, and module graph, that a within-budget fixture returns `null`, and that the formatted text matches the asserted message.

## 2. Enforcement Mode In The Exact-Package Gate

- [ ] 2.1 Read `A1_STARTUP_BUDGET_ENFORCEMENT` in `test/foundation/release/package-startup.integration.test.ts`, treating every value other than `record` as `fail`; verify an unconfigured run keeps failing on an overrun.
- [ ] 2.2 Replace the three assertion calls with one gate helper that evaluates, records the violation, emits a `::warning::` annotation, and throws only in `fail` mode; verify all three launch kinds and both profiles are still measured once per profile on the first attempt with no retry.
- [ ] 2.3 Add `enforcement` and `budgetViolations` to the `a1-startup-performance-evidence-v1` payload without renaming or removing an existing field, and assert the complete six-measurement set so a launch that never rendered still fails in `record` mode.

## 3. Channel Wiring

- [ ] 3.1 Set `A1_STARTUP_BUDGET_ENFORCEMENT` from `needs.plan.outputs.mode` in the `release.yml` validation step, add the per-platform `STARTUP_PERFORMANCE_RESULT` path, upload it with the platform outcomes, and append a Windows startup summary table to the step summary; verify develop resolves to `record` and every other mode to `fail`.
- [ ] 3.2 Set `A1_STARTUP_BUDGET_ENFORCEMENT: record` on the `ci.yml` startup group and `fail` on the `full-regression.yml` validation step; verify the complete gate states its mode explicitly.
- [ ] 3.3 Update `test/repository-governance/package-suite-ownership.test.ts`, `full-regression-policy.test.ts`, and `ci-release-runbook.test.ts` to pin the new helper and the per-channel modes without weakening an existing assertion; verify `npx vitest run test/repository-governance` passes.

## 4. Specifications And Documentation

- [ ] 4.1 Reconcile the `isolated-regression-testing` startup budget scenarios with the canonical `a1-shell` budgets and add the development-publication recording requirement; verify the no-automatic-retry scenario is retained unchanged.
- [ ] 4.2 State the recording and enforcing channels in `a1-shell` and define the `A1_STARTUP_BUDGET_ENFORCEMENT` contract in `continuous-integration`; verify the two canonical specifications no longer contradict each other.
- [ ] 4.3 Document both modes, the evidence fields, and the rollback in `docs/validation.md`; verify the documented variable name and artifact path match the implemented workflows.
- [ ] 4.4 Run focused startup, package-suite, and repository-governance tests plus typechecking and record the exact commands and outcomes; do not run `test:fast`, `test:full`, or `test:release` without a separate request.
