## 1. Add semantic settings styles

- [x] 1.1 Extend the owned UI theme seam with a heading role mapped to the active Pi theme's Markdown-heading color, and verify theme/unit tests distinguish heading, accent, border, and existing row roles.
- [x] 1.2 Render shared settings group headers in bold heading role while retaining selected-label and muted-value semantics, and verify list-view tests cover selected, unselected, hovered, and section-header output.

## 2. Frame the settings screen

- [x] 2.1 Add the full-width border-role top rule, one-column-inset bold accent `Settings` title, and full-width content/footer divider, and verify an ordinary named-theme frame has the required row order and semantic roles.
- [x] 2.2 Allocate list and footer geometry around framed chrome, centralize list-to-screen row conversion, and verify scrolling, sticky headers, rail presentation, menus, search, notices, and structured dialogs remain inside the exact frame.
- [x] 2.3 Update pointer and scrollbar hit geometry for the shifted list origin, and verify row hover/value activation, wheel ownership, thumb drag, track paging, menu selection, and structured-dialog input act on the visibly targeted rows.

## 3. Validate presentation and compatibility

- [x] 3.1 Add focused settings regressions for ordinary, overflowing, searched, menu, structured-dialog, narrow-width, and short-height states, verifying exact row count, ANSI-aware width, stable footer chrome, and no invisible pointer targets.
- [x] 3.2 Verify the Pi-backed dark theme resolves the frame to blue rules, the title to cyan, and section headings to the same yellow heading color as `What's New`, while the `a1 pi` comparison path remains unchanged.
- [x] 3.3 Run strict OpenSpec validation, typechecking, and focused settings/component tests; attempt the supported local build, record any host-toolchain-only limitation, and prepare the candidate for required exact-head CI and visual handoff.

## 4. Refine alignment and search composition

- [x] 4.1 Inset settings section rows and setting-row markers to the title's left edge, carry that offset into pointer/menu geometry, and left-align settings footer guidance at the same edge.
- [x] 4.2 Replace the ordinary bottom divider with search-owned input chrome while search is active, avoiding a duplicate divider.
- [x] 4.3 Add focused alignment/search regressions, run strict OpenSpec validation, typechecking, startup architecture checks, and focused tests; record the Windows checkout's CRLF-sensitive ledger limit and prepare renewed exact-head CI and visual handoff.

## 5. Restore shared search chrome and scroll the title

- [x] 5.1 Restore the shared search input's top rule, prompt row, and bottom rule while using its top rule instead of the settings-owned divider.
- [x] 5.2 Let the `Settings` title scroll out with list movement while only the active section heading pins, and derive list, rail, pointer, menu, and footer geometry from the current title visibility.
- [x] 5.3 Add focused regressions for ruled search composition, title scrolling, section pinning, changing rail origin, wheel ownership over opening chrome, and constrained frames; then rerun local validation and prepare renewed exact-head CI.

## 6. Fix the top rule and start scrolling at the top

- [x] 6.1 Reserve the blue top rule independently so it remains visible while the title scrolls away and the active section pins immediately below it.
- [x] 6.2 Remove the scrollbar's extra top inset so its track starts at the top of the current scrolling region before and after the title disappears.
- [x] 6.3 Verify fixed-rule/title-scroll composition, section pinning, rail geometry, pointer behavior, ruled search, constrained frames, and local validation before renewed exact-head CI and visual handoff.

## 7. Preserve the opening spacer and raise the scrollbar

- [x] 7.1 Preserve the shared layout's initial spacer between the `Settings` title and first section.
- [x] 7.2 Extend the scrollbar track one row upward alongside the title while keeping its scrolled origin beside the pinned section.
- [x] 7.3 Verify ordinary rendering, search Ctrl+Home/Ctrl+End, scrolling, exact frames, pointer geometry, and rail interaction with the title-level track.

## 8. Refine search closure and dropdown marks

- [x] 8.1 Remove the synthetic trailing search-result spacer so final content meets the ruled input without an empty row.
- [x] 8.2 Snapshot the pre-search scroll position and restore it when an untouched search closes, while invalidating the snapshot after edits or navigation.
- [x] 8.3 Paint dropdown effective-value checkmarks in the accent role without replacing the selected row's panel/highlight treatment.
- [x] 8.4 Add focused regressions and rerun strict OpenSpec, type, architecture, route-theme, settings, and component validation.

## 9. Let the search footer scroll all results

- [x] 9.1 Route wheel input anywhere over the search footer, including its bottom status row, to the result list and invalidate untouched-search restoration after deliberate wheel navigation.
- [x] 9.2 Verify wheel scrolling from the bottom row reaches the actual final setting without restoring an obsolete pre-search position.
