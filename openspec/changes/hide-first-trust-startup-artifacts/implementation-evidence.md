# Implementation evidence

Implementation continued in the linked `D:/Git/a1/.worktrees/first-trust-startup-cleanup` worktree and draft PR #811 after the maintainer approved the refined resident-rendering plan and requested implementation.

## Completed startup outcome

- The attach presentation state recognizes a blank starting surface that follows already drawn startup content for the same tab and child incarnation.
- Consecutive blank revisions keep that handoff active, while the next drawn surface, another lifecycle state, a different child, or body clearing ends it.
- The blank handoff forces the outer cursor hidden and projects the viewed starting chip without its provisional lifecycle glyph.
- Starting-glyph debounce and hold bookkeeping is cleared for that chip so an earlier animation frame cannot survive into the quiet handoff.
- Working and restoration indicators on other tabs remain unchanged, and ordinary blank idle surfaces retain their normal cursor behavior.
- Focused native tests cover legacy and structured surfaces across initial blank, trust dialog, repeated blank handoff, drawn shell, and ordinary idle states.

## Rendering refinement results

- The owned default tool shell now treats its pending, success, or error background as the enclosing row background and reapplies it after nested SGR full/default-background resets.
- Explicit nested RGB/palette backgrounds, foregrounds, emphasis, links, content, wrapping, collapse behavior, and the independent pinned `a1 pi` bytes remain unchanged.
- Full-width pending, success, and error fixtures assert every trailing cell returns to the enclosing tool background, while existing exhaustive scrollbar replay verifies that the reserved rail remains a separately painted overlay over the continued row surface.
- Custom-viewport transitions assert exactly one current jump-to-bottom control across dock movement, generic-to-counted relabeling, hover changes, and removal; live-status tests retain exactly one current `Working` row through alignment, replacement, settlement, and reset.
- The Pi fullscreen damage path now has a terminal replay sequence that moves and clears bottom controls/status rows and proves the old row is absent from both its remembered frame and terminal cells.
- Native retained capture fixtures preserve explicitly styled trailing blanks and observe a cleared former control row as changed state.
- Native structured presentation explicitly resets and erases each changed unobscured row before repainting its complete retained cells, preventing terminal-specific blank-cell or wrap behavior from retaining an obsolete control, status line, text, or background. Overlay-clipped rows retain their established cell-by-cell protection.

## Validation

- `npm run typecheck` passed.
- Focused Vitest coverage passed: 200 tests across tool-shell parity, transcript viewport, bottom-control provenance, damage-aware terminal replay, scrollbar-edge terminal replay, and session-shell viewport/status behavior.
- Focused pinned-source governance passed: 10 tests for source headers and feature-adoption metadata.
- `npm run check:code-documentation:changed` passed.
- `node D:/Git/a1/node_modules/@fission-ai/openspec/bin/openspec.js validate hide-first-trust-startup-artifacts --strict` passed.
- `git diff --check` passed.
- `node scripts/governance/check-delivery-body.mjs --body-file .artifacts/agent/pr-body.md --final` passed for the intended completed body.
- Current `origin/develop` remained the branch merge-base and the implementation head was pushed before completion.
- Rust tests were not run locally because this machine has no Cargo/Rust toolchain; exact native compilation and execution remain owned by pull-request CI.

## Manual local test

Build and launch from Windows Git Bash:

```sh
cd /d/Git/a1/.worktrees/first-trust-startup-cleanup && npm run build && ./scripts/dev
```

1. On a profile that still needs project trust, confirm the project and verify the blank handoff has no chip spinner or body cursor before the shell appears.
2. Ask the Agent to run a command that produces short lines, long wrapped lines, colored output, and a hyperlink. Verify each pending/success/error tool block keeps one continuous background through the right content edge while the scrollbar remains confined to its rail.
3. Scroll upward, allow one or more messages to complete, and grow then shrink the editor with multiline input. Verify exactly one current `Jump to bottom` or counted `new message` badge appears and the former row is restored when it moves.
4. Return to the end, start and settle another operation, and verify only one live `Working` row appears and no stale status or control remains above the editor.
5. Repeat the background and bottom-row checks after resizing the terminal and while the scrollbar is active.

Manual observations are optional maintainer evidence and do not gate implementation completion. No manual result has been reported for this implementation head yet.

## Known gaps

None in the implemented behavior. Local native-test execution is an environment limitation rather than a delivered behavior gap; required native CI remains authoritative.
