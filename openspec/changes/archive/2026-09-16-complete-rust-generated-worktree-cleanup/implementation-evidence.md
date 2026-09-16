## Implementation summary

- Added the exact `native/process-guardian/target` root to the standard completion policy and registration-state validator without admitting generic or sibling Cargo targets.
- Exercised successful central-policy cleanup, persisted-state exactness, near-match preservation, separate generated/ordinary budgets, and nested-repository, link, and special-file blockers in temporary repositories.
- Updated the operator runbook and added a fixture assertion that every exported central disposable root remains documented.

## Validation

- `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` — **49 passed, 0 failed, 0 skipped**.
- `npm run typecheck` — passed.
- `openspec validate complete-rust-generated-worktree-cleanup --strict --no-interactive` — passed.
- `git diff --check` — passed.

`npm ci` completed to provide the pinned local toolchain. Its install-time `bin/pi-tui.d.ts` rewrite was restored and is not part of this change; no dependency manifest changed.

## Gap disposition

No implementation gaps are accepted. Live cleanup is intentionally not exercised before this policy is reviewed, integrated, and available from current `develop`; no other session's worktree is touched by this change. A later standard `complete` invocation remains subject to ownership, exact merged-delivery evidence, remote-ref absence, the shared mutation lock, and every content boundary.
