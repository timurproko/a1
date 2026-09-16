# Implementation Evidence

## Delivered behavior

- `local-worktree-cleanup.mjs complete` accepts one exact primary/worktree/change/PR identity, explicitly creates and releases a registration when needed, evaluates only that candidate, and reuses the existing evidence, journal, non-force worktree-removal, and compare-and-delete local-ref safeguards.
- The command applies the central generated-path policy (`node_modules`, `dist`, `.builds`, `.artifacts/openspec-archive`) without enabling or scanning the persistent queue. Unknown ignored, staged, unstaged, untracked, linked, special, or nested content still blocks.
- Cleanup now distinguishes tracked `.gitmodules` metadata from actual nested Git metadata, gitlinks, and configured submodules. The repository's tracked empty vendor `.gitmodules` fixture is accepted while real nested structures remain blocked.
- Delivery guidance requires the standard command and prohibits agents from manually choosing disposables or deleting generated files, worktrees, and local branches.

## Focused validation

- `npm ci --ignore-scripts` — completed; 285 packages installed. npm reported two pre-existing moderate audit findings and no install failure.
- `node --test test/repository-governance/local-cleanup.node.mjs test/repository-governance/local-cleanup-evidence.node.mjs test/repository-governance/local-cleanup-watch.node.mjs` — passed: 46 tests.
- `npx vitest run test/repository-governance/local-cleanup.test.ts test/repository-governance/change-delivery-guidance.test.ts` — passed: 2 files, 5 tests.
- `npm run typecheck` — passed.
- `openspec validate automate-managed-worktree-cleanup --strict` — passed.
- `git diff --check` — passed.
- An initial focused guidance run exposed the skill's 600-word limit; the cleanup handoff was shortened and the focused suite then passed without relaxing the limit.

## Disposable-repository proof

The dependency-free fixtures create real temporary Git repositories and worktrees. They verified exact candidate selection, internally generated ownership, queue-disabled completion, central generated paths, unrelated-registration isolation, non-force removal, unchanged local-ref deletion, already-absent retry, unknown-content retention, current/primary/cross-root rejection, tracked empty `.gitmodules`, configured submodule metadata, gitlinks, nested `.git`, interruption, and journal resume.

After authorized merge and remote topic-ref removal, this change's live handoff command is:

```bash
node scripts/governance/local-worktree-cleanup.mjs complete --repo D:/Git/a1 --path D:/Git/a1/.worktrees/automate-managed-worktree-cleanup --change automate-managed-worktree-cleanup --pr 435
```

The live worktree remains present while PR #435 is open.

## Acceptance scenarios

- One exact post-merge command verifies and removes an eligible managed worktree and unchanged local branch without per-agent cleanup decisions.
- Repository-generated dependencies and finalization reports are handled automatically while unknown ignored or user-authored content remains protected.
- Tracked empty vendor `.gitmodules` metadata does not block cleanup, while real nested repositories, gitlinks, configured submodules, and submodule changes do.

## Known gaps

None.
