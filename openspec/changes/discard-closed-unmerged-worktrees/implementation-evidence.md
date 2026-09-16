## Delivered behavior

- Added an exact `discard --confirm-closed-unmerged` command that binds one closed-unmerged same-repository PR to one registered worktree and never enables or scans queue/watch.
- Added bounded rejection evidence, explicit discard-role state, remote-delete journal steps, expected-SHA leased remote deletion, post-delete verification, local revalidation, non-force worktree removal, and atomic unchanged local-ref deletion.
- Preserved `complete`, automatic merged-branch cleanup, generated-content boundaries, active ownership, dirty-content refusal, protected/reserved/fork/advanced ref refusal, mutation locking, and partial recovery.

## Validation

- `npm ci --ignore-scripts` — completed with 285 packages; npm reported two pre-existing moderate audit findings and no install failure.
- `node --test test/repository-governance/local-cleanup*.node.mjs` — **57 passed, 0 failed, 0 skipped**. All GitHub evidence and remote deletion behavior used in-memory request fixtures or disposable temporary repositories; no live remote ref or retained worktree was mutated.
- `npx vitest run test/repository-governance/local-cleanup.test.ts test/repository-governance/change-delivery-guidance.test.ts --no-file-parallelism` — final run passed **2 files / 6 tests**; the cleanup bridge completed in 68.8 seconds.
- `npx vitest run test/repository-governance/code-documentation.test.ts --no-file-parallelism` — passed **25 tests**.
- `npm run typecheck` — passed.
- `npm run check:architecture` — passed architecture, product-identity, pinned-Pi-ledger, and terminal-host provenance checks.
- `npm run check:docs-governance` — passed.
- `npm run check:repository-governance` — read-only report matched repository policy with no mutation.
- `openspec validate discard-closed-unmerged-worktrees --strict --no-interactive` — passed.
- `git diff --check` — passed.

The first combined Vitest attempt passed the cleanup bridge but failed the concise-skill limit because the updated delivery skill contained 615 words against the existing `<600` assertion. The guidance was shortened without dropping discard authority or safeguards; the focused rerun and final combined run passed. No timeout, production bound, assertion, or required coverage was weakened.

## Gap disposition

No implementation gap is accepted. A live discard of PR #440 is intentionally deferred until this tooling is manually merged, verified, available from current `develop`, and its own topic ref cleanup completes. PR #440's remote branch, worktree, local branch, and released registration remain intact; implementation tests do not use them as disposable fixtures.
