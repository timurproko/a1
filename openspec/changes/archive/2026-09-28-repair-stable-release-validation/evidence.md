## Failed stable release preserved

- Source: `bb2aa9aee054c7612ba453c96456a7e75650da24` (`develop` at dispatch)
- Run: [36388284997](https://github.com/timurproko/a1/actions/runs/36388284997)
- Candidate: `0.2.1`
- Every native lane reached complete validation; publication and every downstream publication/record/completion job were skipped.
- Linux and both Windows lanes exposed stale README lifecycle assertions in `release-target.test.ts` after the concise README changes in #607/#608.
- macOS additionally exposed lexical `/var` versus canonical `/private/var` expectations in `project-trust-preflight.test.ts`.
- Windows Node 22 additionally completed the persistent-unwritten-session assertions and then received `EBUSY` while removing its temporary fixture root. Windows Node 24 passed the same scenario.
- Both Windows lanes passed `loads Windows NUL cleanup inline across session replacement without changing profile extensions`, the scenario recorded by the older generated PR #597. During this implementation, #597 independently finalized and merged as `af4db315`; this branch rebased onto it rather than duplicating its cleanup change.
- Registry inspection returned `E404` for both `@timurproko/a1@0.2.1` and `@timurproko/a1-install@0.2.1`; no `v0.2.1` tag or GitHub Release exists. Existing `latest` tags were not moved.

## Implemented evidence

- The root `README.md` is unchanged.
- `scripts/release/check-release-documentation.mjs` checks concise command examples independently from detailed runbook target, publication-order, reopening, manual-merge, and immutable-recovery gates. It imports only Node built-ins and can run in the dependency-free documentation-only lane.
- Both documentation-only and changed-file documentation CI paths invoke the checker against the authoritative impact artifact. Unrelated documentation selections report the check as not applicable.
- Project-trust tests derive expected trust labels and persisted entries from `realpathSync(cwd)` while retaining lexical `cwd` in the prompt request.
- Runtime-integration teardown inherits #597's awaited product disposal and retries only recursive test-root removal, five times at 100 ms; exhaustion remains fatal.

## Local validation

No local full or release suite was run.

- `npm ci`: passed; its prepare build passed all generated-artifact and startup byte-budget checks.
- `npm run typecheck`: passed after the isolated pinned install/build.
- `npx vitest run test/repository-governance/release-target.test.ts test/repository-governance/impact-aware-validation-workflows.test.ts test/repository-governance/github-repository-governance.test.ts test/integrations/pi/engine/project-trust-preflight.test.ts --config vitest.config.ts`: 59 passed on the reconciled head.
- `npx vitest run test/integrations/pi/engine/runtime-integration.test.ts --config vitest.config.ts --maxWorkers=1 --no-file-parallelism`: 10 passed on the reconciled head, including the current persistent-unwritten-session and prior NUL-cleanup scenarios.
- Relevant and unrelated impact-fixture executions of `check-release-documentation.mjs`: passed with `OK` and `not applicable`, respectively.
- `npm run check:code-documentation:changed`: passed.
- `npm run check:docs-governance`: passed.
- `openspec validate repair-stable-release-validation --strict`: passed.
- `git diff --check`: passed.

## Required remote and post-merge evidence

- Finalized exact-head Development validation must pass every selected job before manual merge.
- After merge, a fresh `npm run release -- patch` must select unpublished `0.2.1` and pass candidate acquisition, every Windows/Linux/macOS complete-validation lane, OIDC publication of both packages, exact registry verification, every native published-pair lane, stable records, aggregate completion, and the manually merged development reopening.
