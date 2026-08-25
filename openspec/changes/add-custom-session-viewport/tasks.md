## 1. Build the shared viewport primitives

- [x] 1.1 Extend the shared scrollbar with `always | hover | hidden` appearance, `thin | thick` style, per-rail recent-activity/hover/drag visibility, stable hover gutter reservation, themed track/thumb painting, and central normal/high wheel distances of three/six lines; verify focused component tests cover the complete appearance/style/state matrix, linger expiry, hidden interaction, track paging, drag clamping, and two independent rails
- [x] 1.2 Add the neutral submitted-prompt row composer for prefix width, continuation indentation, local `HH:mm` source timestamps, right alignment, narrow-width omission, and ANSI-safe width; verify focused tests cover one-line, multiline, resumed-timestamp, wide-character, styled, and insufficient-width prompts
- [x] 1.3 Add the neutral transcript viewport state and frame compositor for exact-height clipping, follow/detach transitions, semantic prompt anchors, sticky-row prominence, scroll-to-bottom overlay/hit regions, scrollbar composition, grapheme-aligned transcript selection/highlighting, and resize clamping; verify pure tests cover every custom-session-viewport scenario without constructing Pi components

## 2. Route viewport input before the TUI consumes it

- [x] 2.1 Add a neutral pre-TUI input stage to the Pi runtime adapter's terminal bridge and verify adapter tests prove listener ordering, consume/transform behavior, mixed mouse-plus-keyboard preservation, removal, mode switching, and disposal without exposing Pi listener types
- [x] 2.2 Bind the viewport's wheel, hover, thumb-drag, track-page, sticky-prompt, scroll-to-bottom, and ordinary LMB transcript-selection actions through the pre-input stage while leaving unrelated input to the focused surface; verify shell/runtime tests cover fullscreen wheel precedence, regular/fullscreen selection and OSC 52 copy, modal ownership, pointer regions, and drags ending on release
- [x] 2.3 Pair pointer reporting with the bare-A1 viewport lifecycle in regular mode and clear transient viewport state on session replacement, failure, shutdown, and disposal; verify terminal-write tests prove every enable has a disable and comparison profiles never enable reporting for this customization

## 3. Compose the owned shell into document and dock regions

- [x] 3.1 Refactor the shell root to produce explicit document rows and unchanged dock rows in the existing queued/status/widgets/input/footer order, plus semantic user-prompt row anchors; verify current shell parity tests still pass on the pinned layout path and no status, footer, editor, workflow, or extension component is reimplemented
- [x] 3.2 Add the custom exact-height render path behind a typed shell option, allocating terminal rows between the transcript viewport and dynamic dock; verify shell tests cover overflow, multiline editor growth, queued input, extension widgets, editor replacement, footer changes, narrow terminals, and resize without moving dock rows into transcript history
- [x] 3.3 Replace the bare-A1 user-block presentation with the owned timestamped prompt adapter while retaining Markdown, theme, complete text, component identity, and source timestamp; verify component and shell tests prove timestamps survive resumed sessions and sticky copies reuse the source row without prototype mutation
- [x] 3.4 Connect prompt submission, transcript growth, session replacement, and render requests to viewport follow state without invalidating unrelated finalized blocks; verify tests prove following output advances, detached streaming stays fixed, submission and the bottom control resume following, and scrolling to a prompt remains detached

## 4. Declare settings and profile scope

- [x] 4.1 Declare live A1 settings `scrollbarAppearance` (`always`, `hover`, `hidden`; default `hover`), `scrollbarStyle` (`thin`, `thick`; default `thin`), and `scrollbarSpeed` (`normal`, `high`; default `normal`) with three/six-line wheel distances; verify settings declaration, resolution, section, persistence, and invalid-value tests
- [x] 4.2 Pass the loaded settings session into the bare-A1 shell through composition and subscribe the viewport to live appearance/style/speed changes; verify integration tests prove a change repaints without restart while preserving scroll/follow state and writes only the active profile's A1 settings document
- [x] 4.3 Select the custom viewport only when A1-owned surfaces are enabled, leaving `a1 pi` and `a1 sandbox` on the pinned comparison presentation; verify composition and launch-profile tests prove bare A1 has the viewport controls while both explicit profiles have none, regardless of stored A1 scrollbar values

## 5. Preserve performance, provenance, and acceptance

- [x] 5.1 Add containing shell scenarios for commands, selectors, dialogs, queued work, extension widgets/statuses, working animation, streaming tools, resize, selection/copy, and shutdown inside the viewport; verify outcomes and component content match the existing shell while only placement/navigation differ
- [x] 5.2 Add long-transcript render-count and streaming fixtures proving scroll, hover, linger, style changes, and one streamed block reuse finalized block caches and decorate only the visible window; verify per-update work does not grow through re-rendering unchanged components
- [x] 5.3 Update `docs/architecture/ui-reference-provenance.md` with the exact prototype units analyzed, behaviors adapted, semantic A1 destinations, and rejection of prototype patches/private child-tree reads; verify architecture and provenance governance name every adapted unit
- [ ] 5.4 Commit the implementation from its detached worktree, open the behavior pull request, and verify the required GitHub development validation and strict OpenSpec validation pass before requesting acceptance
- [ ] 5.5 Perform user-controlled manual acceptance in a real terminal for long-session scrolling, detached streaming, submission, all scrollbar appearance/style/speed states, drag and track paging, the bottom control, timestamped sticky prompts, selectors, resize, selection/copy, comparison profiles, and parent-terminal restoration; record the exact accepted candidate before merge
- [ ] 5.6 After the accepted implementation is integrated, archive this OpenSpec change, integrate the archive update, and remove/prune only the worktrees and remote branches whose pull requests are confirmed merged
