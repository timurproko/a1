## Why

Impact selection now engages on ordinary pull requests, but one class of change still runs everything. PR #455 changed one engine adapter, its test, and the fixture `test/fixtures/prompt-suggestion-conversations.ts`; the ownership policy maps every path under `test/support/` and `test/fixtures/` to all eight PR-core owners, and each selected core owner links its integration owners, so the run selected 323 tests, 21 resource-sensitive tests, and all nine integration owners in `impact` mode. That fixture is imported by three test files owned by two owners. Any edit to shared test support, which most feature PRs touch, is a full run, about 22 runner-minutes against the 12-minute target.

Full regression also has no schedule. `update-performance` is a timing assertion that runs on every affected pull request while the only exhaustive owner, `update-predecessor`, and the startup budget's `fail` mode run only when someone dispatches Full regression or when the nightly publication happens to reach them, so an exhaustive regression surfaces as a publication failure.

## What Changes

- Attribute a changed shared test-support or fixture path to the owners of the tests that import it, following relative imports transitively through other support files, instead of to every declared owner. A support file that no retained test imports, that a non-test module imports, or that cannot be scanned keeps the declared owner set, and the selection records `shared-support` with the importing tests as its reason.
- Schedule `full-regression.yml` nightly at 02:47 UTC on `develop`, keeping manual dispatch, so exhaustive owners and the startup budget's enforcement run every day independent of publication.
- Demote `update-performance` to `exhaustive` cadence: its assertion is wall-clock timing on a shared runner, which the plan moved out of pull-request gates; its deterministic contract coverage stays on pull requests through the existing focused tests.
- Record the resulting selection on a fixture-only diff and on PR #455's change list in the ownership tests, and update the runbook and specs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Shared test support selects the owners of its importing tests with a fail-closed fallback to the declared set; Full regression runs on a nightly schedule; a timing-only integration owner is exhaustive.

## Impact

Implementation affects `scripts/release/validation-ownership.mjs` (import attribution), `config/validation-ownership.json` (unchanged rule shape, documented fallback), `config/integration-owners.json` (`update-performance` cadence), `.github/workflows/full-regression.yml` (schedule), `config/github-repository-governance.json`, `test/repository-governance/validation-ownership.test.ts`, `integration-owner-registry.test.ts`, `full-regression-policy.test.ts`, `validation-impact.test.ts`, `docs/ci-release-runbook.md`, and the capability above. It does not change the PR core's mandatory scopes, conservative selection, the naming or documentation gates, the resource-sensitive partition, or what Full regression executes.
