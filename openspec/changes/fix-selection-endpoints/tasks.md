## 1. Shared selection normalization

- [ ] 1.1 Change ordinary dragged-range normalization in `src/ui/components/text-selection.ts` to include both grapheme endpoints while preserving half-open output; verify shared-model tests for adjacent forward/reverse drags and identical reversed endpoint pairs.
- [ ] 1.2 Retain the accepted-motion distinction through return to anchor and release; verify `bc` -> `c` -> `cd` and mirrored sequences, repeated anchor reports, release-to-one-character, and empty unextended clicks in shared-model tests.
- [ ] 1.3 Update the former near-boundary expectations and cover multiline first/last characters plus wide, combining, emoji, and ANSI endpoints; verify exact normalized bounds and copied source strings, including distinct motion within a wide grapheme.

## 2. Viewport and owned fullscreen integration

- [ ] 2.1 Audit shared-model consumers and reconcile transcript viewport and owned fullscreen fallback assumptions without changing prompt-editor selection; verify integration tests show inclusive endpoints, retained return-to-anchor selection, and matching copy output in each affected surface.
- [ ] 2.2 Add viewport regressions for multiline block selection in both directions, including first/last source characters and content edges; verify endpoint highlighting and exact copied text with no padding, scrollbar, pinned-copy, control, or dock leakage.
- [ ] 2.3 Preserve semantic word/line selection, active-selection continuation through no-button reports, copy clearing, and ordinary-click input ownership; verify the corresponding shared, viewport, and shell/controller tests retain those behaviors.

## 3. Rendered evidence and automated validation

- [ ] 3.1 Update selection-related shell/terminal-paint evidence for inclusive endpoint cells and return-to-anchor gestures at a declared geometry including 192 columns by 54 rows; verify final cell backgrounds and copied bytes agree for single-character, adjacent, and multiline sequences in both directions.
- [ ] 3.2 Preserve existing immediate-presentation, stale-frame suppression, long-transcript row reuse, streaming overlap, resize, styling/link, scrollbar-mode, auto-scroll, and terminal-restoration coverage; verify required CI passes without weakening these assertions or changing scheduling.
- [ ] 3.3 Open a separate implementation PR citing the accepted `fix-selection-endpoints` change; verify the diff leaves `a1 pi`, upstream/installed Pi packages, dependencies, and terminal-owned regular-mode selection unchanged, and record strict OpenSpec validation and required CI results.

## 4. Physical-terminal acceptance and completion

- [ ] 4.1 Deliver an exact-candidate handoff with worktree, branch/commit, build plus `./scripts/dev` command, expected gestures, and known gaps; verify the handoff exercises bare A1's owned selection directly in Windows Terminal/Git Bash.
- [ ] 4.2 Obtain explicit user acceptance of the screenshot-equivalent multiline boundary gesture and one-character left/anchor/right reversal, including clipboard verification; record candidate revision, terminal geometry, and observed results, leaving this task incomplete until the user confirms.
- [ ] 4.3 After acceptance and explicit merge authorization, integrate the code PR and record its merged state; then synchronize delta specs and archive the accepted change in a spec-only follow-up, verifying strict validation and cleaning up retained worktrees only after their PRs merge.
