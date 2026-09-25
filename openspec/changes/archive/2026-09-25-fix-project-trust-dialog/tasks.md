## 1. Correct folder-scoped trust resolution

- [x] 1.1 Add focused preflight tests proving an uncovered resource-free directory under `ask` prompts, an unrelated sibling is not covered by another folder's exact decision, and a descendant remains covered only by an explicitly saved ancestor.
- [x] 1.2 Remove the resource-discovery implicit-trust bypass while preserving saved decisions, `always`/`never`, interactive persistence, noninteractive fail-closed behavior, and pre-resource ordering.
- [x] 1.3 Verify accepted and denied decisions remain canonical, path-scoped, restart-stable, and compatible with the existing in-session trust workflow.

## 2. Present a compact bottom trust dialog

- [x] 2.1 Add renderer coverage for vertically compact geometry, bottom anchoring, full-width blue rules, title/path/options/hint styling, selected-row changes, and narrow or short terminals.
- [x] 2.2 Implement the startup-safe bottom dialog using fixed wording and ANSI roles only, without importing project settings, themes, extensions, prompts, packages, skills, or post-trust components.
- [x] 2.3 Preserve arrows, Tab, Enter, Escape/Ctrl+C, compatibility `y`/`n`, raw-mode transitions, clear/redraw behavior, cursor state, and exactly-once terminal restoration across success, cancellation, end, and error.

## 3. Validate startup safety and handoff

- [x] 3.1 Run focused project-trust engine and renderer tests plus source typechecking, startup-graph, architecture, and strict OpenSpec checks; record implementation evidence and any explicit known gap.
- [x] 3.2 Build and prepare a color-preserving manual launch handoff from two unrelated folders and one covered descendant, verifying per-path decisions, full-width blue-rule appearance, cancellation, and parent-terminal restoration.
