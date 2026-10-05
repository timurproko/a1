# Implementation evidence

## Result

- Cleanup now recognizes a structurally valid terminal journal carried with the same repository to another canonical path or Windows drive.
- Mutation-locked operations atomically rebase only repository path identity and completed entry paths; read-only access reports `state-relocation-required` without mutation.
- Owned, released, partially deleting, malformed, escaped, duplicate-after-rebase, repository-mismatched, and remote-mismatched state remains fail-closed.
- Migrated history grants no candidate authority: a current worktree is captured and registered afresh before ordinary cleanup evaluation.
- The actual 44-entry `D:/Git/a1` journal was validated in memory against the current `E:/Git/a1` identity; all entries are terminal and eligible for the bounded migration after this delivery merges.
- Post-merge recovery command: `node scripts/governance/local-worktree-cleanup.mjs complete --repo E:/Git/a1 --path E:/Git/a1/.worktrees/support-cleanup-origin-rewrites --change support-cleanup-origin-rewrites --pr 673`.

## Validation

- `node --test test/repository-governance/local-cleanup.node.mjs` — 79 tests passed.
- `node --test test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` — 18 tests passed.
- Focused relocation fixtures — terminal drive/path migration, fresh registration, active/partial/mismatched/topology/path/duplicate rejection, and failed atomic replacement passed.
- `npm run check:architecture` and `npm run check:code-documentation:changed` — passed after dependency installation.
- `npx openspec validate support-cleanup-repository-relocation --strict` and `git diff --check` — passed.

## Known gaps

None.
