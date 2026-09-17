# Design

## Shared support is owned by whoever imports it

The ownership policy maps `test/support/` and `test/fixtures/` to every PR-core owner because, when the policy was written, nothing could say which tests a support file served. The repository can say it now: every test imports its support through relative specifiers (`../../support/x.js`, `../../../fixtures/y.js`), and support files import each other the same way. A reverse import graph over `test/**` answers "which retained tests reach this file" in one pass.

`loadValidationOwnership` already discovers every test file; it additionally reads every `.ts`, `.mts`, `.js`, and `.mjs` file under `test/` once, extracts static `import`/`export ... from` specifiers that start with `./` or `../`, resolves them against the importing file (mapping `.js` to `.ts` and `.mjs` to `.mts` when the target does not exist as written), and keeps only edges that stay inside `test/`. The result is a map from each test-tree path to the set of retained tests that reach it transitively, bounded to the existing test population limit. Dynamic imports, `vi.mock` string targets, and `require` calls are treated as ordinary specifiers when their argument is a string literal; anything else is ignored, which can only widen the fallback below.

`selectValidationOwnership` uses the map for shared paths only. For a changed path that matches a `shared` rule:

- when at least one retained test reaches it, the selection records `shared-support` for each owner of a reaching test, with the reaching tests as the reason paths (bounded to sixteen);
- otherwise (no retained test reaches it, which includes a helper consumed only from outside `test/`, or the scan failed) it records `shared-support-declared` for every owner the rule declares, exactly as today's selection.

Owned and changed-test rules are unchanged, so a support file that is also an owner's `paths` match still selects that owner. Integration owners follow from the narrowed core selection through the existing `coarse-owner` link and through their own explicit `support` declarations, which this change does not touch. The spec's rule that reachability is never the sole authority for a known coarse owner holds: reachability only narrows the shared rule's declared set, and the declared set remains the floor whenever reachability cannot answer.

Replaying PR #455's change list through the new rule selects `pi` (the fixture's importers are `adapter.test.ts`, `prompt-suggestion-provider.integration.test.ts`, and `session-shell.test.ts`, all Pi-owned) and `release-package-update` (for `config/startup-graph-baseline.json`), 104 tests instead of 323 and 12 resource-sensitive tests instead of 21, with five pull-request integration owners instead of nine.

## A nightly that exists

`full-regression.yml` gains `schedule: cron: "47 2 * * *"`. On a schedule `github.sha` is the `develop` tip, which is what the workflow's `dispatch-commit` trust source already checks out; nothing else in the workflow changes. The governance inventory records the new trigger. Nightly publication keeps its own complete validation; the scheduled Full regression is the run that fails visibly when an exhaustive owner regresses, without touching publication authority.

## Timing owners are exhaustive

`update-performance` asserts elapsed time for the update path on a Windows runner. That is the class of assertion the validation plan removed from pull-request gates (the startup budget already records on PRs and enforces nightly). Its cadence becomes `exhaustive`; the registry test lists both exhaustive owners; the selection evidence lists it as cadence-deferred on every PR. The update path's deterministic contracts remain covered on pull requests by `pi-release-resume` and `package-contracts`.

The startup budget test is not split. With `STARTUP_BUDGET_ENFORCEMENT: record` on pull requests and `fail` on the scheduled Full regression and nightly publication, the plan's target state for A1 (budgets as evidence on PRs, enforced nightly) is already met once the schedule exists; splitting the file would only move the same five measurements to a second owner.

## Not done here

Form-rule gates (line caps, code-documentation policy) stay required. The plan proposed making them advisory when every CI failure cost a revert, a fix, and a refinalize; after automated finalization a failure costs one commit and one run, and the documentation policy is what keeps `Rationale:` and `Security:` comments honest. Naming stays required for the same reason: it protects product identity, not form.
