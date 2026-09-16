# Implementation Evidence

## Delivered behavior

- The exact completed-delivery disposable policy now includes `.artifacts/validation` alongside the existing dependency, build, and OpenSpec finalization roots.
- Representative ignored `impact.json` and `code-documentation.json` reports are removed only through the ordinary candidate-scoped, journaled, non-force worktree path.
- `.artifacts` itself, `.artifacts/other`, `.artifacts/validation-user`, unknown ignored content, links, special files, nested repositories, and other existing safety blockers remain unauthorized.
- CLI help and cleanup documentation expose the exact policy and its component boundary.

## Focused validation

- `npm ci --ignore-scripts` — completed; 285 packages installed. npm reported two pre-existing moderate audit findings and no install failure.
- `node --test test/repository-governance/local-cleanup.node.mjs` — passed: 34 tests.
- `npx vitest run test/repository-governance/local-cleanup.test.ts test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/code-documentation.test.ts --no-file-parallelism` — passed: 3 files, 31 tests. The cleanup bridge also ran the dependency-free cleanup, evidence, and watch fixtures.
- `npm run typecheck` — passed.
- `node scripts/governance/check-code-documentation.mjs --mode changed --selection .artifacts/validation/impact.json --result .artifacts/validation/code-documentation.json` — passed with no violations after generating current implementation-bound impact selection.
- `openspec validate include-validation-artifacts-in-managed-cleanup --strict` — passed.
- `git diff --check` — passed.

## Retained live handoff

The PR #435 worktree remains registered and released at `D:/Git/a1/.worktrees/automate-managed-worktree-cleanup`. Its pre-correction completion report retained these exact generated blockers:

- `.artifacts/validation/code-documentation.json`
- `.artifacts/validation/impact.json`

After this correction is manually merged, verified `accepted-and-archived`, deployed to primary `develop`, and its remote topic ref is absent, retry PR #435 from the primary checkout with:

```bash
node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/automate-managed-worktree-cleanup --change automate-managed-worktree-cleanup --pr 435
```

The corrective worktree remains present at `D:/Git/a1/.worktrees/include-validation-artifacts-in-cleanup` while PR #438 is open. It must use its own exact completion command only after its authorized merge and post-merge verification.

## Acceptance scenarios

- Exact ignored validation reports no longer require ad hoc agent deletion and do not block an otherwise eligible completed worktree.
- Sibling, near-match, unknown, linked, special, and nested artifact content remains protected.
- Retained PR #435 cleanup can be retried through the same standard command after the correction is deployed.

## Known gaps

None. The live retry is intentionally pending deployment and authorized merge; it is not bypassed during implementation.
