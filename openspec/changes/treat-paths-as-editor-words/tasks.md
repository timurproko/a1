## 1. Path token boundaries

- [x] 1.1 Add a pure prompt-line path-range detector for drive-rooted, UNC, POSIX-rooted, dot-relative, parent-relative, home-relative, and balanced quoted paths; verify table-driven tests cover both slash directions, spaces inside quotes, multiple tokens, cursor-intersecting ranges, and ordinary punctuation that must not match

## 2. Word-only editor integration

- [x] 2.1 Extend the existing owned editor segmentation boundary to merge detected path ranges only for word-mode calculations, including correct remapping when Pi passes text before or after a caret inside the path; verify focused tests prove Ctrl+Left/Right reach path boundaries without intermediate punctuation stops
- [x] 2.2 Preserve Pi's native word-deletion path so Ctrl+Backspace/Delete remove a complete path from its outer boundary and the directional portion from an interior caret; verify focused tests cover undo, kill-ring yank, change notification, autocomplete/history safety, Unicode paths, and multiple adjacent path tokens
- [x] 2.3 Prove ordinary Left/Right and Backspace/Delete remain grapheme-based, prompt chips retain their existing stronger atomic behavior, non-path punctuation retains pinned boundaries, custom bindings invoke the same semantics, and the `a1 pi` profile remains byte-for-byte aligned with pinned Pi for the covered inputs

## 3. Validation and acceptance

- [ ] 3.1 Run the focused editor/component/session-shell tests and typecheck, then push the implementation PR and verify its required CI check passes
- [ ] 3.2 In Windows Terminal, launch the implementation worktree through `./scripts/dev` and confirm the example `D:/Git/a1/.worktrees/prevent-windows-nul-artifacts-impl` moves and deletes as one word with Ctrl actions while unmodified arrows and deletion remain character-based
