## 1. Shared Support Attribution

- [x] 1.1 In `scripts/release/validation-ownership.mjs`, build a bounded reverse import map over `test/**` during `loadValidationOwnership` (static relative `import`/`export ... from`, string-literal dynamic `import`, `vi.mock`, and `require` specifiers; `.js`/`.mjs` mapped to `.ts`/`.mts`; edges kept only inside `test/`), and expose for each test-tree path the set of retained tests that reach it transitively.
- [x] 1.2 In `selectValidationOwnership`, attribute a changed path matching a `shared` rule to the owners of its reaching tests with the path and those tests as `shared-support` reason paths; fall back to the rule's declared owners with the `shared-support-declared` code when no retained test reaches it or the scan failed; keep owned-path and changed-test rules unchanged and keep the ownership digest stable for unchanged inputs.
- [x] 1.3 Extend `validation-ownership.test.ts`: a fixture imported by one owner's tests selects only that owner and its linked integration owners; a support file imported through other support files reaches the transitive importers; an unreferenced support file and a missing graph select every declared owner with the fallback code; a replay of PR #455's change list selects `release-package-update` and `pi` only with under half the remainder tests.

## 2. Nightly And Cadence

- [x] 2.1 Add `schedule: - cron: "47 2 * * *"` to `.github/workflows/full-regression.yml`, keep `workflow_dispatch`, add `schedule` to the workflow's entry in `config/github-repository-governance.json`, and pin both in `full-regression-policy.test.ts` and `github-repository-governance.test.ts`.
- [x] 2.2 Set `update-performance` to `cadence: "exhaustive"` in `config/integration-owners.json`; update `integration-owner-registry.test.ts` to list `update-performance` and `update-predecessor` as the exhaustive owners and every other owner as pull-request; verify the impact and conservative selections record it as `exhaustive-cadence`.

## 3. Documentation And Evidence

- [x] 3.1 Update `docs/ci-release-runbook.md` (impact selection section: shared-support attribution and its fallback; Full regression schedule; exhaustive owners) and its pins in `ci-release-runbook.test.ts`; `config/validation-ownership.json` carries no comment and is unchanged.
- [x] 3.2 Run the ownership, impact, registry, workflow-policy, and governance tests plus typechecking and the governance commands; record the local replay of PR #455's change list before and after; record as post-merge evidence the first ordinary PR touching a fixture (owners selected, runner-minutes) and the first scheduled Full regression run.
