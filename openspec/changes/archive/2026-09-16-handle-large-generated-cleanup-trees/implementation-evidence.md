# Implementation Evidence

## Delivered behavior

- The completion policy and registration schema now recognize only `native/process-guardian/target` and `native/terminal-host/target` as native generated roots.
- Representative output under either exact root completes candidate-scoped non-force worktree/ref removal.
- Root-level `target`, `native/other/target`, and `native/process-guardian/target-user` remain unauthorized and produce `worktree-content` retention.
- Current `develop`'s separately delivered 20,000-entry ordinary and 100,000-entry generated allowances, wall-clock deadline, and full nested-repository/link/special-file checks remain unchanged.

## Reconciliation with current develop

Merged PR #437 (`complete-large-generated-worktree-cleanup`) reached `develop` while this PR was under implementation. It independently resolved PR #435's large dependency-tree blocker using separate ordinary and generated traversal allowances, which is stronger than this branch's initial single-ceiling implementation. This branch was rebased onto that delivery, dropped duplicate traversal code and its oversized physical fixture, and retained only the remaining exact native-root correction.

The first exact-head run before reconciliation timed out because the duplicate 20,050-file fixture caused the cleanup bridge to exceed its established 110-second subprocess bound on hosted Windows. The reconciled focused bridge completes within that bound without increasing any test timeout or weakening any production limit.

## Focused validation

- `npm ci --ignore-scripts` — completed; 285 packages installed. npm reported two pre-existing moderate audit findings and no install failure.
- `node --test test/repository-governance/local-cleanup.node.mjs` — passed: 37 tests in 65.0 seconds.
- `npx vitest run test/repository-governance/local-cleanup.test.ts test/repository-governance/change-delivery-guidance.test.ts --no-file-parallelism` — passed: 2 files, 6 tests; the cleanup bridge completed in 63.2 seconds and ran cleanup, evidence, and watch fixtures.
- `npx vitest run test/repository-governance/code-documentation.test.ts --no-file-parallelism` — passed: 25 tests.
- `npm run typecheck` — passed.
- `node scripts/governance/check-code-documentation.mjs --mode changed --selection .artifacts/validation/impact.json --result .artifacts/validation/code-documentation.json` — passed with no violations after generating current implementation-bound impact selection.
- `openspec validate handle-large-generated-cleanup-trees --strict` — passed.
- `git diff --check` — passed.

## Live retained evidence

PR #435 and PR #438 remain registered as `released`, and their worktrees plus this PR #439 worktree remain present. PR #435 previously reported `content-inspection-budget`; current `develop` now contains PR #437's dedicated generated allowance. PR #438 remains blocked by generated `native/process-guardian/target` content until this exact-root policy is deployed.

After this change is manually merged, verified `accepted-and-archived`, deployed to primary `develop`, and its remote topic ref is absent, retry from the primary checkout in this order:

```bash
node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/automate-managed-worktree-cleanup --change automate-managed-worktree-cleanup --pr 435
node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/include-validation-artifacts-in-cleanup --change include-validation-artifacts-in-managed-cleanup --pr 438
node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/handle-large-generated-cleanup-trees --change handle-large-generated-cleanup-trees --pr 439
```

No generated content, worktree, branch, registration, or mutation lock was deleted or widened manually.

## Acceptance scenarios

- Exact repository-owned native Cargo roots are handled through the existing bounded generated-content inspection and standard completion path.
- Arbitrary, sibling, and near-match `target` trees remain blocked and preserved.
- The deployed separate ordinary/generated budgets and unsafe-content protections remain intact.

## Known gaps

None. Live retries intentionally remain pending deployment and authorized merge; implementation does not bypass their existing blockers.
