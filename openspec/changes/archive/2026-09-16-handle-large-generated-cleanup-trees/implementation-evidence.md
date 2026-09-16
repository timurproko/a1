# Implementation Evidence

## Delivered behavior

- Complete structural inspection now uses a named finite 100,000-entry ceiling while retaining per-entry wall-clock deadline checks and fail-closed `content-inspection-budget` behavior.
- The completion policy recognizes only `native/process-guardian/target` and `native/terminal-host/target`; generic, sibling, and near-match `target` paths remain unauthorized.
- The registration schema accepts those exact native roots and descendants without accepting wildcard or arbitrary native build paths.
- Cleanup continues to traverse every directory entry and reject nested `.git` metadata, links, special files, unknown content, identity drift, deadline exhaustion, and invalid resource-limit inputs.

## Focused validation

- `npm ci --ignore-scripts` — completed; 285 packages installed. npm reported two pre-existing moderate audit findings and no install failure.
- `node --test test/repository-governance/local-cleanup.node.mjs` — passed: 38 tests in 59.3 seconds. The over-20,000-entry completion fixture itself completed in 7.5 seconds and removed the worktree plus unchanged local ref through the normal non-force path.
- `npx vitest run test/repository-governance/local-cleanup.test.ts test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/code-documentation.test.ts --no-file-parallelism` — passed: 3 files, 31 tests. The cleanup bridge ran the cleanup, evidence, and watch fixtures in 56.8 seconds.
- `npm run typecheck` — passed.
- `node scripts/governance/check-code-documentation.mjs --mode changed --selection .artifacts/validation/impact.json --result .artifacts/validation/code-documentation.json` — passed with no violations after generating current implementation-bound impact selection.
- `openspec validate handle-large-generated-cleanup-trees --strict` — passed.
- `git diff --check` — passed.
- An initial focused run exposed that the registration schema also needed the two exact native roots. The schema was extended without allowing generic `target` or `native/other/target`, and the full focused run then passed.

## Live retained evidence

Read-only measurement found 20,062 entries under the retained PR #435 `node_modules` tree and 24,046 entries across that worktree, explaining the former 20,000-entry blocker. The retained PR #438 Cargo tree contained 38 structurally ordinary entries. Repository cleanup state still records both candidates as `released`, and all three relevant worktrees remain present while PR #439 is open.

After this change is manually merged, verified `accepted-and-archived`, deployed to primary `develop`, and its remote topic ref is absent, retry from the primary checkout in this order:

```bash
node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/automate-managed-worktree-cleanup --change automate-managed-worktree-cleanup --pr 435
node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/include-validation-artifacts-in-cleanup --change include-validation-artifacts-in-managed-cleanup --pr 438
node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/handle-large-generated-cleanup-trees --change handle-large-generated-cleanup-trees --pr 439
```

No generated content, worktree, branch, registration, or mutation lock was deleted or widened manually.

## Acceptance scenarios

- Structurally safe standard generated dependency trees above the former 20,000-entry ceiling complete full inspection and ordinary removal below the new finite ceiling.
- Exact repository-owned native Cargo roots are handled automatically while arbitrary, sibling, and near-match `target` trees remain blocked.
- Entry or deadline exhaustion and unsafe nested content continue to retain the worktree without partial trust.

## Known gaps

None. Live retries intentionally remain pending deployment and authorized merge; implementation does not bypass their existing blockers.
