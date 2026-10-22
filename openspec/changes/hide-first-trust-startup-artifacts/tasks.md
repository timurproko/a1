## 1. Quiet startup handoff state

- [x] 1.1 Track a viewed tab's drawn-startup to blank-starting transition in attach presentation state, keep the classification across consecutive blank revisions, and verify focused native state tests distinguish it from an initially blank or ordinarily idle surface.
- [x] 1.2 End the handoff classification on the next drawn surface or non-starting lifecycle and verify normal cursor and status projection return immediately.

## 2. Cursor and strip presentation

- [x] 2.1 Force the final cursor hidden during the quiet handoff and verify structured and legacy blank surfaces cannot expose a cursor below the strip.
- [x] 2.2 Suppress the viewed chip's starting glyph during the quiet handoff, clear held/debounced glyph state, and verify working, input-needed, settlement, restart, restoration outside the handoff, crash, and failure indicators remain unchanged.

## 3. Completed startup regression record

- [x] 3.1 Add a focused native sequence test covering a drawn trust frame, repeated blank starting frames, and the first drawn shell frame; verify the blank interval has neither lifecycle glyph nor cursor and the shell frame restores normal presentation.
- [x] 3.2 Record the delivered trust-handoff behavior, focused-check results, and local Cargo availability in implementation evidence.

## 4. Full-width tool background composition

- [x] 4.1 Add focused tool-shell fixtures that expose nested SGR full/background resets inside pending, successful, and failed rows, including short text, links, wrapped output, collapse hints, and explicit nested backgrounds.
- [x] 4.2 Scope nested renderer styling to the enclosing tool-shell background so every available content cell returns to the tool state background without changing text, foreground roles, links, wrapping, or `a1 pi` comparison output.
- [x] 4.3 Verify content padding and hidden/visible scrollbar modes preserve one continuous component background while the reserved rail remains a separately painted overlay.

## 5. Coherent transient bottom rows

- [x] 5.1 Add custom-viewport transition tests for a jump-to-bottom control that moves, changes between generic and counted labels, changes hover state, and disappears as dock height, follow state, or content changes; assert the former row is restored and exactly one current control remains.
- [x] 5.2 Add transition coverage for bottom-aligned live-status rows appearing, changing height, and disappearing without leaving duplicate `Working` rows.
- [x] 5.3 Trace those transitions through the Pi fullscreen damage writer and resident structured capture/replay, repair the first divergent row-damage boundary, and verify cleared, replacement, and styled trailing blank cells converge to the newest complete frame.
- [x] 5.4 Preserve row-bounded differential rendering, popup clipping, cursor placement, hyperlinks, selection, and successful-write baseline acknowledgement while repairing stale-row replacement.

## 7. Comprehensive solo/resident parity repair

- [x] 7.1 Reproduce cell loss with terminal-generated blank backgrounds, erases, and scrolling; distinguish raw cell content colors from ordinary style colors.
- [x] 7.2 Repair capture and any divergent retained damage/replay boundary without changing solo source rendering or introducing whole-screen repaint as a workaround.
- [x] 7.3 Add capture-to-wire-to-replay parity sequences covering all cells, attributes, links, wide glyphs, scrolling, rail/control movement, shrinking content, and synchronized write fragmentation.
- [x] 7.4 Run focused native/TypeScript tests and typecheck, document root causes and bounded evidence, reconcile current develop, and complete delivery bookkeeping.

## 8. Screenshot-driven residual repair

- [x] 8.1 Reproduce stale controls, shifted rail cells, and duplicate live rows through incremental PTY/chunk capture rather than final-only parser snapshots; repair the first divergent boundary.
- [x] 8.2 Keep the scrollbar in one fixed gutter column with its top gap, extending through the final transcript row while retaining the shell-owned dock gap through scrolling and dock changes.
- [x] 8.3 Give tab chips one leading space and one icon/name separator, including animated and icon-less states; update exact spacing and hit/width regressions.
- [x] 8.4 Repair the CI-reported fixture environment key, cross-adapter import, startup-graph bounds, and oversized functions without relaxing policy; run focused regression, native, architecture, naming, typecheck, and build checks.

## 9. Streaming detached-control residual repair

- [x] 9.1 Reproduce the misplaced rail fragments at the jump-to-bottom row using streaming Cyrillic content and wheel input through the real fullscreen runtime; compare solo, overlay composition, and resident parsing boundaries.
- [x] 9.2 Repair the first divergent boundary without text deduplication, style masking, or disabling differential rendering; cover control appearance, movement, relabeling, and removal.
- [x] 9.3 Run focused native and fullscreen regressions, typecheck, architecture/governance checks, and the checkout build; record evidence and complete same-PR bookkeeping.

## 6. Validation and delivery record

- [x] 6.1 Run focused TypeScript tests, typecheck, strict OpenSpec validation, changed-file governance checks, and available native checks; record Cargo unavailability rather than claiming native execution when it remains absent.
- [x] 6.2 Publish one copy-pasteable Windows Git Bash worktree build/launch command and a manual checklist covering first trust, short and internally styled tool rows, active scrollbar, detached control relabel/movement, and live-status removal; record reported observations when available without making manual validation a completion gate.
- [x] 6.3 Update implementation evidence and the plain PR acceptance outcomes, resolve every pre-ready task or record a maintainer-approved known gap, reconcile and push current `origin/develop`, and verify the implementation-bound body before completing the final implementation outcome.

## 10. Remaining badge-row rail displacement

- [x] 10.1 Compare solo and nested resident output at every badge-visible frame, including markdown tables and the exact centered control. Verify the running dev artifact identity before attributing the failure to source.
- [x] 10.2 Reproduce the displaced rail in a deterministic regression and repair the owning capture/replay boundary without masking cells, disabling differential output, or changing the correct rail geometry.
- [x] 10.3 Complete touched tests, typecheck, evidence, baseline reconciliation and delivery bookkeeping for the repaired candidate.
