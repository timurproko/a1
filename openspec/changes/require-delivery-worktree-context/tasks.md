## 1. Make worktree association a delivery prerequisite

- [ ] 1.1 Update the repository workflow context and concise delivery skill so a new interactive delivery creates its fresh worktree, successfully runs `a1 session link-worktree <absolute-worktree>`, and only then edits planning or implementation files.
- [ ] 1.2 Define fail-visible behavior for an unavailable or rejected association and preserve explicit worktree scoping while the primary checkout remains on `develop`.
- [ ] 1.3 Define resumed and switched-stream behavior so the owning session relinks the exact existing worktree and approved implementation retains the same worktree, branch, history, and PR.

## 2. Align documentation and conformance evidence

- [ ] 2.1 Update worktree setup documentation to distinguish the linked session repository context from process/tool cwd and from cleanup ownership or authority.
- [ ] 2.2 Extend focused repository-governance tests to reject guidance that omits the exact link command, pre-edit ordering, failure handling, or primary/worktree separation.
- [ ] 2.3 Run strict OpenSpec validation and the focused guidance/session-context test scopes; record implementation evidence without claiming that static guidance tests alone prove agent compliance.

## 3. Verify the visible delivery context

- [ ] 3.1 From an A1 session started in the primary `develop` checkout, create and link an owned feature worktree and verify the footer follows its path and branch while repository commands remain explicitly scoped there.
- [ ] 3.2 Create or use the delivery's draft PR and verify bounded refresh displays its `#<number>` in the linked footer without worktree scanning, cwd mutation, or a second delivery identity.
