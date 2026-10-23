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

A Windows-only fixture launches the test binary as a real ConPTY child, answers the startup cursor query, and compares its transformed PTY output against the same solo source frames. It has bounded child/output waits and no Node or shell dependency. These earlier sequences preserved control movement without duplicates but did not independently reproduce the screenshot's duplicate label. The residual refinement below establishes that missing cause with actual fullscreen source output and a separate parser oracle.

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

## Residual screenshot repair

The maintainer's subsequent screenshots still showed duplicate old/current badges, shifted gutter cells, repeated live headings, and transcript fragments below the current content edge. Comparing solo and resident geometry confirmed the intended contract: the child receives outer height minus one, and resident presentation adds exactly one row. That offset was not the reproduced first divergence.

The actual source rows still carried upstream OSC 133 A/B/C semantic-zone annotations. Styling/padding and span replay moved those annotations away from the row prefix Pi strips, including into the gutter. A direct terminal ignored them, but Ghostty correctly implements OSC 133 A as a fresh-line operation. ConPTY compacted positioned source paints into cursor-forward/erase/CRLF output; the leaked markers then caused extra virtual line advances. An independent xterm replay of that exact ConPTY output matched the solo source while the resident parser displaced rows into the dock. Synthetic terminal-generated cells and marker-free all-CUP sequences did not expose this interaction.

The custom viewport now removes only its internal A/B/C zones, for BEL and ST terminators, from final composed rows and dock-only output. Semantic prompt anchors remain authoritative, and genuine shell OSC 133 behavior is unchanged. The source/TUI/ConPTY reproduction then had matching visible rows; ConPTY's differing foreground attribute on inkless padding was not misreported as a remaining layout mismatch.

Additional delivered changes:

- The final endpoint correction keeps the top track gap and extends track/thumb glyphs through the final transcript row. The shell supplies the bottom dock gap; paint and hit geometry use the same full track extent.
- The final maintainer refinement keeps both gaps: tab chips start with one space and separate the lifecycle icon from its name with one space. Icon-less chips keep the leading space. Widths and hit regions include exactly the painted padding and separator cells.
- The new real-shell fullscreen regression checks every physical row, including the dock/footer, at three child heights through 40 transitions each. It exercises wheel scrolling, editor growth/shrinkage, badge relabeling, live-status changes, content replacement, and return-to-bottom. Disabling the annotation removal makes all three new cases fail; restoring it passes.
- A gutter regression covers styled, empty, and annotated rows through five dock heights. Native coverage retains actual OSC 133 fresh-line behavior and exercises real ConPTY for both raw child output and resident output with its additional strip row, with captures after 1-, 7-, and 4096-byte fragments.
- CI's fixture-key and seven architecture failures are repaired without bypasses: the fixture uses a non-branded test key, component background scoping stays in its owning adapter, duplicate fallback handling is shared locally, the dock-only frame derives unchanged fields from its established frame, and native damage/suffix/sequence helpers are split. The size ratchet is lowered; startup and function-size limits are not raised.

Prior refinement validation passed: 196 viewport/shell/terminal-replay tests, 86 tool/runtime/image tests, 24 native presentation tests, 26 native strip tests, 7 native capture/parser tests, typecheck, the complete architecture command, changed-file code-documentation governance, and the full naming audit (zero violations). The full managed/native checkout build also passed with exit code zero. Reproduction payloads are synthetic ignored scratch; permanent regressions depend on no artifact file.

## Final tab-spacing refinement

The maintainer's final request retains both gaps: one leading cell before the icon and one separating cell before the name. Status-glyph helpers return only the glyph; chip composition owns the separator, omitting it for icon-less chips. Painted width and hit width include the exact leading, glyph, separator, and trailing cells. The focused 26-test strip suite, typecheck, architecture boundaries, changed-file code-documentation check, strict OpenSpec validation, and full managed/native build passed for this refinement.

## Streaming scroll mode repair

The later quiz screenshots still showed displaced rail fragments near the detached control. Comparing the public solo fullscreen implementation with the actual tab-host entry sequence exposed another independent discrepancy: solo sends DECAWM disable (`CSI ?7l`), but the outer host previously entered alternate screen without disabling auto-wrap.

A real Windows ConPTY regression now uses the production `ENTER_OUTER_MODES`, not a duplicated fixture sequence. With Unicode rows, full-width positioned paints, and moving/relabeling/removing down-arrow controls, the former host sequence put the next row's first `1` into the previous row's last column (row 3, column 39), where the source held a blank. An independent xterm replay confirmed that the outer ConPTY bytes themselves were displaced. The same test passes after disabling wrapping. The direct child reference already disabled wrapping, as solo does. Thus matching terminal modes repairs physical presentation rather than hiding a stale glyph or changing transcript text.

The host now disables auto-wrap on fullscreen entry and restores it on exit. A native terminal-state test verifies last-column overwrite while the host owns the grid and normal next-line wrapping after restoration. Child terminal modes and the one-row strip offset are unchanged. A separate UTF-8 test confirms that Cyrillic continuation bytes do not create false control boundaries.

The real owned-shell fullscreen regression now routes wheel and Ctrl+End input through the terminal bridge and registered pre-input listener. Its streaming case grows a live Cyrillic quiz over 64 updates, detaches with wheel input, changes editor height, relabels the badge on completion, and removes it on returning to the end. Every visible row, dock/footer row, control count, and gutter column is compared with the current source frame. The native ConPTY fixture checks raw-child and resident-output paths, the real entry modes, and captures after 1-, 7-, and 4096-byte fragments.

The requested rail endpoint is restored down by one cell: the track spans the last transcript row, and the shell's existing spacing remains outside it. The previous additional final-transcript gap was unnecessary. Targeted validation passed: 98 fullscreen/scroll tests, 25 native presentation/ConPTY tests, 25 native attach tests, typecheck, the complete architecture command, and changed-file documentation governance. The full checkout rebuild passed with exit code zero, as did strict OpenSpec/body validation and the naming audit with zero violations. A fresh dev attach is required to pick up the changed entry modes.

## Remaining badge-row displacement repair

The running dev native artifact matched the rebuilt checkout; stale binaries were not assumed. Independent solo/source and isolated ConPTY prefix comparisons had no glyph differences, but a real resident app with a local synthetic provider reproduced the screenshot's displaced rail during badge-to-rail hover. The retained source put the glyph in column 120; the outer VT stream put it in column 119. The malformed output contained a clamped cursor-forward move followed by a backspace before the glyph. A cursor-anchor workaround passed the original geometry but failed a wider Ctrl+End case and was discarded.

The repair changes Windows outer output from Rust's console stdout conversion to UTF-8 `WriteFile` bytes under the existing stdout lock. Console output encoding is selected for that writer's lifetime and restored on drop; redirected output does not change console encoding, and non-Windows output is unchanged. Source rows, colors, hyperlinks, synchronized-output markers, and differential damage remain intact.

A permanent sanitized synthetic viewport fixture is checked in under `native/terminal-host/tests/fixtures/viewport-hover.json`; tests read no ignored scratch. With the former writer, its native regression fails at row 19, column 118: expected blank, actual rail glyph. The production byte writer passes all three badge-visible states at widths 100, 120, 121 and 132 with 1-, 7- and 4096-byte replay fragments, checking text, widths, backgrounds, and console-code-page restoration. The existing strict style/link and Unicode parity cases remain unchanged.

Current targeted results: 26 native presentation tests and 25 native attach tests pass. Real-app loopback-provider runs pass 15 physical/source comparisons at each of 100x30, 120x32, 121x32 and 132x36 outer geometry: 60 snapshots with zero cell-text/width mismatches, including completion, repeated badge/rail hover and return-to-bottom. These comparisons do not claim screenshot confirmation or exact physical foreground attributes. The full managed/native checkout rebuild, typecheck, complete architecture command, changed-file documentation governance, strict OpenSpec validation and full naming audit also pass. The final body and finalization inspection complete the delivery record; exact-head CI remains the post-push authority.

## Relayed-frame coherence repair

The maintainer's manual test of the previous head still showed flashing while scrolling and a rail fragment near the last transcript row in multi-agent mode only. The retained per-stage observations of the previous real-app run were analyzed per child frame: of 259 frames on the viewed tab, eight produced two or more holder commits and outer paints, each with the shape begin marker, about 4.3 KiB of re-rendered cells, end marker, then a 108–181 byte render pass 8–23 ms later. Replaying the recorded outer byte stream transaction by transaction found one intermediate paint that repainted a single row and removed the `Ctrl+End` badge before the next paint restored it; every settled snapshot matched the retained source cell for cell. Three direct ConPTY probes with a Node child confirmed the mechanism independently of the holder: ConPTY relays `CSI ? 2026 h` and `CSI ? 2026 l` as they are parsed (as one 16-byte pair for small frames, or separately for frames above Node's 8 KiB console write size), and the re-rendered cells follow in their own pipe writes up to 15 ms later. The end marker therefore marks the frame as parsed, not rendered, and the holder's end-marker commit published the renderer's partial state.

`native/terminal-host/src/roles/holder.rs` now keys publication on a platform fact: on Unix the PTY relays bytes verbatim and the end marker still commits immediately; under Windows ConPTY a relayed end marker closes the transaction but publication waits for the first output after it, then a 2 ms settle so one render pass split across reads is one commit, with a 40 ms bound for a frame whose final console call changed no cell. A begin marker that arrives while that render pass is pending keeps the torn state private. Unpublished parser changes carry across coalescing rounds, and the idle wait shortens to the earliest pending decision. The duplicated begin/end commit arms collapsed into one boundary path, which also brought `run_holder` under its size-ratchet baseline. Four new deterministic unit tests cover the verbatim and relayed policies, the render-pass settle, the deadline, and the begin-while-pending case; the full native library suite (251 tests) passes.

With the rebuilt host, two real-app loopback-provider runs at 120x32 repeated the previous probe: the frame that previously arrived as begin, 4342 bytes, end, 181 bytes now produces exactly one holder commit, published after the trailing pass; no frame on the viewed tab produced a torn commit, and the only frames with two commits were a begin marker flushing a settled prior change followed by the frame itself. The intermediate-frame probe sampled 147 frames through four wheel cycles and a 60-step thumb drag with zero missing-badge, zero displaced-rail, and zero blank-rail samples, and a transaction-by-transaction replay of the recorded outer bytes found no transaction that removed the badge or placed a rail glyph outside its column. A long-transcript variant (300 trailing rows, so the thumb is short and scrolling runs far from the end) gave the same result. All settled snapshots still match the retained source cell for cell. Frames that ConPTY renders in one pass after both markers publish about 2 ms later than before; frames whose render pass trails the end marker publish when that pass lands instead of twice. `npm run typecheck`, `npm run check:architecture` (with the lowered `run_holder` ratchet entry), changed-file code-documentation governance, strict OpenSpec validation, rustfmt, and `git diff --check` pass. A fresh dev attach is required to run the rebuilt holder.

## Manual local test

Build and launch from Windows Git Bash:

```sh
cd /d/Git/a1/.worktrees/first-trust-startup-cleanup && npm run build && ./scripts/dev
```

1. On a profile that still needs project trust, confirm the project and verify the blank handoff has no chip spinner or body cursor before the shell appears.
2. Ask the Agent to run a command that produces short lines, long wrapped lines, colored output, and a hyperlink. Verify each pending/success/error tool block keeps one continuous background through the right content edge while the scrollbar remains confined to its rail.
3. Scroll upward, allow one or more messages to complete, and grow then shrink the editor with multiline input. Verify exactly one current `Jump to bottom` or counted `new message` badge appears and the former row is restored when it moves.
4. Return to the end, start and settle another operation, and verify only one live `Working` row appears and no stale status or control remains above the editor.
5. Repeat the background and bottom-row checks after resizing the terminal and while the scrollbar is active. Verify rail glyphs stay in one gutter column through the final transcript row, retain their top gap, and stop outside the shell-owned dock spacing; the dock/footer must not retain transcript rows.
6. Check working, completed, and input-needed tab chips: exactly one space precedes the lifecycle icon and exactly one space separates it from the name. Icon-less chips retain one leading space.
7. In a freshly launched dev session, stream a long Cyrillic quiz, wheel away from the end, and grow/shrink the editor. Verify the current badge and rail stay aligned, the track reaches the final content row without entering the dock, and Ctrl+End removes the badge. Detaching must restore normal shell wrapping.
8. While detached from the end, move the pointer repeatedly between the centered badge and the right rail, then press Ctrl+End. Repeat at a narrow and wide window size; no rail fragment should move into the neighboring content cell.
9. With a long completed answer (several screens of wide, styled rows), hold the wheel in both directions and drag the thumb up and down. The transcript must move without flashing, the `new message` badge must stay solid while it is shown, and no rail fragment may appear beside the gutter on the last transcript row. Compare with the same scrolling in `a1 solo`.

The maintainer's screenshots on the prior candidate showed resident degradation despite correct solo output and motivated the comprehensive refinement above. There is no manual result for the new repair head yet. Manual observations remain optional and do not gate implementation completion.

## Known gaps

No deferred implementation scope. Automated parity covers the bounded sequences above, not arbitrary terminal programs or every physical terminal emulator. Required current-head CI remains authoritative; screenshot-level manual confirmation has not been claimed.
