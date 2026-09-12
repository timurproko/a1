## 1. Establish the owned presentation boundary

- [ ] 1.1 Add failing focused editor/shell regressions recording prompt-border, caret, and footer terminal rows before and after autocomplete opens, filters, and closes; verify both persistent-history modes reproduce the original below-prompt displacement.
- [ ] 1.2 Reuse the owned wrapper's body-boundary information to expose shared body/menu offsets, preserving both existing editor paths and source attribution; verify body boundaries, prefix, border indicators, paste chips, and cursor markers for single-line, wrapped, scrolled, and Unicode drafts without accessing private autocomplete state.

## 2. Compose autocomplete above the prompt

- [ ] 2.1 Move the existing rendered completion block above the upper border only in bare A1, preserving list order, foreground styling, pagination, and key semantics; verify command, argument, path/resource, and extension-provider completions use the same placement on both existing editor paths.
- [ ] 2.2 Preserve existing menu sizing, selection window, visible-item setting behavior, and terminal clipping rather than introduce a capacity budget; verify configured limits and resize/narrow-terminal cases retain their existing behavior with only row placement and menu background/cell-padding decoration changed.
- [ ] 2.3 Apply the shared body offset to selection painting and editor pointer routing while treating menu rows as non-text dock chrome; verify clicking, dragging, copying, and cursor placement target actual prompt cells and never include completion rows.

- [ ] 2.4 Replace the top-line decoration with a darker background across existing menu rows at the full editor width, including padding and pagination, through the owned theme/presentation boundary. Add no line or extra row. Verify both history modes, readable text/descriptions and active selection across theme changes, cell-aware coverage after resize, ANSI-reset containment, no stale shading after dismissal, and non-text pointer behavior on shaded padding without changing item limits or pagination.

## 3. Verify lifecycle and integration

- [ ] 3.1 Add shell and final-terminal-cell coverage for open/filter/page/Escape/no-match cycles and asynchronous result arrival/cancellation; verify unchanged prompt/footer coordinates and removal of stale menu rows for empty, long, detached, and streaming transcripts, including widgets above and below the editor.
- [ ] 3.2 Preserve fixed-height dock-only reuse and invalidate geometry on menu-height or terminal-size changes; verify repeated list navigation avoids rendering settled transcript blocks and that viewport follow/detach, hit regions, and cursor state remain current.
- [ ] 3.3 Verify Tab/Enter outcomes, Escape cancellation, configurable navigation, autocomplete priority over ghost suggestions, history recall/undo/paste, and extension editor replacement/restoration through focused integration tests.
- [ ] 3.4 Record only the named bare-A1 autocomplete placement and menu background/cell-padding exception in existing compatibility evidence and verify independent `a1 pi`/untouched-Pi comparisons retain pinned rendering and semantics without package mutation, editor replacement, or widened parity normalization.

## 4. Validate and hand off the implementation

- [ ] 4.1 Validate updated OpenSpec artifacts strictly and obtain passing required CI for the separate implementation pull request; record the exact candidate commit and check results without treating unchecked physical review as complete.
- [ ] 4.2 Provide the exact built worktree/commit and color-preserving shell command for Windows Terminal/Git Bash review; record the user's result for slash-list open/filter/navigation/dismissal, multiline input, resize, and comparison behavior, with no prompt jump attributable only to the menu, and verify a distinct darker menu background, readable text and active selection, no top line, and no residual shading after dismissal.
- [ ] 4.3 After explicit user acceptance and merge authorization, merge the code pull request and verify its merged state; record acceptance and synchronize/archive the completed change in a specification-only follow-up before cleaning up the retained worktrees.
