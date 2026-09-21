## 1. Add semantic settings styles

- [ ] 1.1 Extend the owned UI theme seam with a heading role mapped to the active Pi theme's Markdown-heading color, and verify theme/unit tests distinguish heading, accent, border, and existing row roles.
- [ ] 1.2 Render shared settings group headers in bold heading role while retaining selected-label and muted-value semantics, and verify list-view tests cover selected, unselected, hovered, and section-header output.

## 2. Frame the settings screen

- [ ] 2.1 Add the full-width border-role top rule, one-column-inset bold accent `Settings` title, and full-width content/footer divider, and verify an ordinary named-theme frame has the required row order and semantic roles.
- [ ] 2.2 Allocate list and footer geometry after fixed chrome, centralize list-to-screen row conversion, and verify scrolling, sticky headers, rail presentation, menus, search, notices, and structured dialogs remain inside the exact frame.
- [ ] 2.3 Update pointer and scrollbar hit geometry for the shifted list origin, and verify row hover/value activation, wheel ownership, thumb drag, track paging, menu selection, and structured-dialog input act on the visibly targeted rows.

## 3. Validate presentation and compatibility

- [ ] 3.1 Add focused settings regressions for ordinary, overflowing, searched, menu, structured-dialog, narrow-width, and short-height states, verifying exact row count, ANSI-aware width, stable fixed chrome, and no invisible pointer targets.
- [ ] 3.2 Verify the Pi-backed dark theme resolves the frame to blue rules, the title to cyan, and section headings to the same yellow heading color as `What's New`, while the `a1 pi` comparison path remains unchanged.
- [ ] 3.3 Run strict OpenSpec validation, typechecking, focused settings/component tests, and required exact-head CI; then hand off the built candidate for visual confirmation in the supported development launcher with any known gaps stated explicitly.
