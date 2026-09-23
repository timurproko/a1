## 1. Keep exact merged PR associations

- [ ] 1.1 Rename open-only discovery/parser terminology and accept exact `OPEN` or `MERGED` GitHub results while preserving number, canonical URL, URL-number, and head-branch validation; continue rejecting `CLOSED` and malformed results.
- [ ] 1.2 Keep normalized footer identity state-free so an open-to-merged transition retains the same badge without a redundant view update or presentation change.

## 2. Preserve repository-context invalidation

- [ ] 2.1 Verify changing the selected worktree or branch immediately re-probes the new context and clears the previous PR when no exact relation exists, while a different exact relation replaces it.
- [ ] 2.2 Verify a session started or resumed in the same valid associated worktree can discover its already merged PR without persisting PR identity in the association record.

## 3. Validate and hand off

- [ ] 3.1 Run focused pull-request parser and repository-runtime lifecycle tests plus strict OpenSpec validation; record implementation evidence and dispose any discovered gap explicitly.
- [ ] 3.2 Build the exact candidate and provide a bare-A1 manual handoff showing the merged PR link remains during post-merge cleanup and disappears after switching to an unrelated worktree or branch.
