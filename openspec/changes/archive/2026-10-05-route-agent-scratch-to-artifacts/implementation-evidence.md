## Implementation outcome

- Agent-facing delivery policy now routes every agent-selected PR/comment body, command payload, captured output, temporary patch/diff, and ad hoc log through the exact `.artifacts/` root of the worktree that owns the operation.
- Configuration, the delivery skill, the OpenSpec runbook, project-structure guidance, and cleanup guidance distinguish those paths from OS temp, home/desktop, the primary checkout, and other worktrees.
- Scratch remains ignored, unstaged, uncommitted, disposable, non-authoritative, and subject to existing sensitive-data and guarded-cleanup boundaries.
- Tool-internal, product-runtime, package/language tooling, test-framework, and hermetic-fixture temporary storage remains outside the agent-selected-path rule.
- The local and remote PR body is maintained at `.artifacts/agent/pr-body.md`; the finalization example now uses `.artifacts/agent/openspec-pr-body.md` rather than `$TMPDIR`.

## Focused evidence

| Command / observation | Outcome |
|---|---|
| `npx vitest run test/repository-governance/change-delivery-guidance.test.ts` before worktree dependency installation | Setup failed before test discovery because the fresh worktree lacked the pinned Pi dependency build output required by global settings-metadata setup. No assertions ran. |
| `npm ci` | Passed; installed the locked dependency graph and completed the repository `prepare` build. npm reported the existing dependency audit summary (2 moderate and 6 high) without changing the lockfile. |
| First focused guidance run after installation | Six existing tests passed and the new test failed because its owning-worktree wording regex was narrower than the valid configuration phrase `worktree that owns`; the assertion was corrected without weakening the path, disposal, or exclusion checks. |
| `npx vitest run test/repository-governance/change-delivery-guidance.test.ts` | Passed: 1 file, 7 tests, 0 failures. |
| `npx openspec validate route-agent-scratch-to-artifacts --strict` | Passed: change is valid. |
| `git diff --check` | Passed with no whitespace errors. |
| Skill word-count guard equivalent to the focused test | Passed at 599 words, below the required 600-word limit. |
| PR-body update through `gh pr edit 676 --body-file .artifacts/agent/pr-body.md`, followed by comparison with `.artifacts/agent/remote-pr-body.md` | Passed; GitHub accepted the implementation-specific acceptance list and the remote body exactly matches the owning-worktree artifact. |

## Known gaps

None. The change intentionally does not intercept temporary paths chosen internally by invoked tools, product runtime code, package/language tooling, test frameworks, or hermetic fixtures.
