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

## Comprehensive parity refinement

The maintainer reported that solo output remained correct while resident output still lost tool backgrounds and showed duplicate bottom controls and rail artifacts. This invalidated the earlier assumption that source-row tests plus explicitly styled-space tests established end-to-end parity. PR #811 was returned to draft and the same change was restored to active form before extending the implementation.

Two generic lossy boundaries now have failing-before/passing-after regressions:

- **Blank backgrounds were read from the wrong representation.** Ghostty stores erased/empty-cell RGB and palette backgrounds in the raw cell content tag, independently of the style record. Reading only `STYLE.bg_color` lost those cells across the whole screen, including tool padding and cleared rows. Capture and legacy ANSI rendering now resolve the raw content background first, retaining symbolic palette indexes and falling back to ordinary styles for text cells. The new erase-fill test failed at row 0, column 0 before the repair; the earlier test that printed styled spaces did not expose this representation.
- **Damage compared indexes rather than referenced values.** A complete structured surface owns its style/link dictionaries. Rebuilt dictionaries can assign the same indexes to changed colors or link targets while leaving row cell records numerically identical. The presenter now recognizes the normal monotonic-table fast path and otherwise checks referenced values before declaring a row unchanged. The rebuilt-dictionary test failed at revision 2 before the repair. Only affected rows repaint; no unconditional screen clear or content-specific deduplication was introduced.

`native/terminal-host/src/roles/presentation/parity_tests.rs` compares every semantic cell, width, style, and link through retained capture, MessagePack round-trip, differential presentation, and parsing of the resulting outer bytes. Its sustained sequence runs 103 frames at each of four widths (24, 80, 132, 192), without forcing or refreshing the source baseline between captures. It covers erases, RGB/palette blank fills, regional scroll in both directions, line insertion/deletion, moving/relabeling/removing bottom controls and status rows, rail changes, wide and combining glyphs, links, attributes, explicit palette/default/cursor colors, and seven-byte fragmentation through UTF-8 and escape sequences. Separate cases cover resize/tab reselection, dictionary replacement, structured fallback, and the legacy renderer.

A Windows-only fixture launches the test binary as a real ConPTY child, answers the startup cursor query, and compares its transformed PTY output against the same solo source frames. It has bounded child/output waits and no Node or shell dependency. These sequences preserve control movement without duplicates. They do not claim an independently reproduced exact cause for the maintainer's screenshot's duplicate label; the regression contract is complete-frame convergence rather than text matching.

### Current focused validation

- `npm run typecheck` passed.
- Four focused Vitest files passed: 152 tests for tool-shell parity, damage-aware terminal, transcript viewport, and bottom-hover composition.
- Focused native presentation tests passed on Windows: 23 tests, including the new full-cell parity and real ConPTY cases.
- Focused native retained-capture/parser tests passed on Windows: 6 tests.
- Focused holder synchronization/commit tests passed on Windows: 8 tests.
- `npm run build` passed, rebuilding the actual Windows native addon and managed checkout payload.
- Changed-file code-documentation governance and `git diff --check` passed.
- Strict OpenSpec validation passed.
- Rust formatting used the installed stable `rustfmt` executable because the pinned compile toolchain lacks the formatter component; compilation and tests used the repository-selected Cargo environment and verified cached VT library.

## Earlier validation

- `npm run typecheck` passed.
- Focused Vitest coverage passed: 200 tests across tool-shell parity, transcript viewport, bottom-control provenance, damage-aware terminal replay, scrollbar-edge terminal replay, and session-shell viewport/status behavior.
- Focused pinned-source governance passed: 10 tests for source headers and feature-adoption metadata.
- `npm run check:code-documentation:changed` passed.
- `node D:/Git/a1/node_modules/@fission-ai/openspec/bin/openspec.js validate hide-first-trust-startup-artifacts --strict` passed.
- `git diff --check` passed.
- `node scripts/governance/check-delivery-body.mjs --body-file .artifacts/agent/pr-body.md --final` passed for the intended completed body.
- Current `origin/develop` remained the branch merge-base and the implementation head was pushed before completion.
- At the earlier implementation stage, local native tests were blocked by absent Cargo. The subsequent Windows-native-bootstrap change made focused native execution available; current results are recorded above.

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

The maintainer's screenshots on the prior candidate showed resident degradation despite correct solo output and motivated the comprehensive refinement above. There is no manual result for the new repair head yet. Manual observations remain optional and do not gate implementation completion.

## Known gaps

No deferred implementation scope. Automated parity covers the bounded sequences above, not arbitrary terminal programs or every physical terminal emulator. Required current-head CI remains authoritative; screenshot-level manual confirmation has not been claimed.
