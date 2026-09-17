## 1. Selector

- [x] 1.1 Remove `implementationBound` from the `manualNoComparison` argument of both the PR-core and integration selections in `scripts/release/validation-impact.mjs`, keeping the docs-only and version-only exemptions disabled for a bound association; verify a bound documentation-shaped diff yields `docsOnly === false`, the ordinary scopes, `prCore.mode === "impact"`, and no selected integration owner.
- [x] 1.2 Add fixtures for a bound diff that touches one owned source path (exactly that owner and its linked integration owners selected, manual dispatch still conservative) and a replay of the PR #441 change list through the retained registries (impact mode, `governance` only, well under the conservative test counts, zero integration owners).

## 2. Matrix

- [x] 2.1 Add `scripts/release/validation-matrix.mjs` with its declaration: the frozen nine-entry matrix, `validationJobGroup`, `resolveValidationJob`, `selectDevelopmentValidationMatrix`, and a CLI that prints `{ include, inactive }` and emits only `{ include }` as `modular_matrix`; verify a conservative selection schedules all nine, an ownerless impact selection schedules only the PR core (plus the resource partition when resource tests are selected), and an exempt selection schedules nothing.
- [x] 2.2 Make `resolve-validation-job.mjs` a CLI over `resolveValidationJob`, import `validationJobGroup` in `require-modular-validation.mjs` in place of its private copy, and register the matrix script as a selection invalidator in `config/validation-ownership.json`; verify the PR-429-shaped promoted job resolution is unchanged.
- [x] 2.3 In `.github/workflows/ci.yml`, run the matrix script in the `changes` job after the selector, publish `modular-matrix`, summarize scheduled and unscheduled entries, and take the `modular` matrix from `fromJSON(needs.changes.outputs.modular-matrix)`; verify the job-level `if` and the in-job resolver step are unchanged.
- [x] 2.4 Add an aggregate fixture that derives the matrix from an impact selection, accepts the run with only the active entries' evidence, and rejects the same run once a scheduled entry's evidence is removed.

## 3. Governance, Documentation, And Evidence

- [x] 3.1 Repoint the matrix pins in `impact-aware-validation-workflows.test.ts`, `package-suite-ownership.test.ts`, and `validation-receipt-workflows.test.ts` at `DEVELOPMENT_VALIDATION_MATRIX`, and pin the workflow's `fromJSON` matrix, the `modular-matrix` output, and the new `changes` step condition.
- [x] 3.2 State the implementation-bound selection rule and the derived matrix in `docs/validation.md` and `docs/ci-release-runbook.md`.
- [x] 3.3 Run the focused selector, matrix, aggregate, and workflow-pin tests plus typechecking and the governance commands, and record the commands and outcomes; record the first ordinary post-merge PR's selection mode, selected owners, and scheduled job count as the post-merge evidence.
