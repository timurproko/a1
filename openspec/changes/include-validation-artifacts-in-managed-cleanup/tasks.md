## 1. Exact Validation Artifact Policy

- [ ] 1.1 Add `.artifacts/validation` to the immutable completion disposable roots and verify CLI help reports the exact expanded policy without authorizing the `.artifacts` parent.
- [ ] 1.2 Update cleanup documentation to identify validation reports as repository-owned generated output and verify sibling, near-match, and unknown artifact paths remain explicitly protected.

## 2. Focused Safety Coverage

- [ ] 2.1 Extend disposable-repository completion fixtures with representative ignored `.artifacts/validation` selection/result reports and verify normal non-force worktree and unchanged local-ref removal succeeds.
- [ ] 2.2 Add sibling and near-match fixtures such as `.artifacts/other` and `.artifacts/validation-user` and verify cleanup retains each candidate with a `worktree-content` blocker.
- [ ] 2.3 Preserve link, special-file, nested-repository, tracked-content, path-containment, unrelated-registration, and idempotency coverage; verify the focused cleanup suite passes without weakening existing assertions.

## 3. Delivery Evidence and Retry Handoff

- [ ] 3.1 Run focused cleanup, guidance, code-documentation, and typechecking validation plus strict OpenSpec validation; record exact commands, results, and explicit gap disposition without running local `test:fast`, `test:full`, or `test:release` absent separate authorization.
- [ ] 3.2 Record the retained PR #435 blocker paths and its exact post-deployment `complete` retry command; verify both the PR #435 worktree and this corrective worktree remain retained until their applicable authorized merges.
