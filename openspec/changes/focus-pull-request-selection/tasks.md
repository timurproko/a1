## 1. Shared Support Attribution

- [ ] 1.1 In `scripts/release/validation-ownership.mjs`, build a bounded reverse import map over `test/**` during `loadValidationOwnership` (static relative `import`/`export ... from`, string-literal dynamic `import`, `vi.mock`, and `require` specifiers; `.js`/`.mjs` mapped to `.ts`/`.mts`; edges kept only inside `test/`), and expose for each test-tree path the set of retained tests that reach it transitively.
- [ ] 1.2 In `selectValidationOwnership`, attribute a changed path matching a `shared` rule to the owners of its reaching tests with those tests as `shared-support` reason paths; fall back to the rule's declared owners with a `declared-fallback` marker when no retained test reaches it, an importer lies outside `test/`, or the scan failed; keep owned-path and changed-test rules unchanged and keep the ownership digest stable for unchanged inputs.
- [ ] 1.3 Extend `validation-ownership.test.ts` and `validation-impact.test.ts`: a fixture imported by one owner's test selects only that owner; a support file imported through another support file selects the transitive importers; an unreferenced support file selects every declared owner with the fallback marker; a replay of PR #455's change list selects `pi` and `ui-rendering` and their linked integration owners only; the selection replay fixture in `generate-validation-selection-replay.mjs` still validates.

## 2. Nightly And Cadence

- [ ] 2.1 Add `schedule: - cron: "47 2 * * *"` to `.github/workflows/full-regression.yml`, keep `workflow_dispatch`, add `schedule` to the workflow's entry in `config/github-repository-governance.json`, and pin both in `full-regression-policy.test.ts` and `github-repository-governance.test.ts`.
- [ ] 2.2 Set `update-performance` to `cadence: "exhaustive"` in `config/integration-owners.json`; update `integration-owner-registry.test.ts` to list `update-performance` and `update-predecessor` as the exhaustive owners and every other owner as pull-request; verify the impact and conservative selections record it as `exhaustive-cadence`.

## 3. Documentation And Evidence

- [ ] 3.1 Update `docs/ci-release-runbook.md` (impact selection section: shared-support attribution and its fallback; Full regression schedule; exhaustive owners) and the `shared` rule comment in `config/validation-ownership.json` if the file carries one.
- [ ] 3.2 Run the ownership, impact, registry, workflow-policy, and governance tests plus typechecking and the governance commands; record the local replay of PR #455's change list before and after; record as post-merge evidence the first ordinary PR touching a fixture (owners selected, runner-minutes) and the first scheduled Full regression run.
