## Implemented behavior

- The native chooser now builds rows from the complete shown-tab order, using the current strip frame's hidden IDs to check only the chips actually visible. A shown Settings tab is treated like any other shown tab; intentionally hidden Settings remains outside the strip and chooser.
- Each paint refreshes open chooser rows, order, checkmarks, anchor, and keyboard focus by stable tab ID. Removing or hiding a target clears that focus; losing overflow closes the chooser. Existing click, Enter, Escape, and view behavior remain.
- At constrained widths, strip controls and hit regions stay within the available columns. The `+` takes priority if fewer than four columns exist; from four columns onward an overflow control is available while tabs are hidden. The clock yields before controls. This is the physical minimum for distinct `+` and overflow targets and does not change ordinary-width placement.
- The bottom popup's pointer-to-action mapping now uses the same physical rows as popup painting rather than separately calculating the row offset. Rows clipped above the terminal cannot receive mouse actions. Top and bottom tests cover a named second row after hover, different heights, a reordered named tab, and a four-row terminal. Keyboard selection still traverses all rows.
- A1 path, usage, and extension truncation now use one dim `…`; the full model name takes priority over usage, provider, route, and thinking detail as space tightens. Complete model/level, PR hyperlinks, semantic thinking color, ordinary widths, and Pi comparison behavior remain intact.

## Pending approved refinement

The all-tab/checkmark popup behavior recorded above is superseded by the approved hidden-only chooser with a selected-chip swap. Its older tests and local results remain historical evidence, not proof of the new behavior. Tasks 1.1, 1.3, 1.5–1.7, and 3.3 remain open until the swap, updated tests, and gap disposition are written.

## Focused local checks

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_PREBUILT_VT=D:/Git/a1/.worktrees/tab-overflow-menu/.artifacts/terminal-vt cargo test --manifest-path native/terminal-host/Cargo.toml --lib roles::strip::tests`: 31 passed. The prebuilt terminal library was fetched from a CI-published, merged branch and verified by the native build.
- Same native environment, `cargo test --manifest-path native/terminal-host/Cargo.toml --lib core::attach::machine::tests`: 23 passed.
- Same native environment, `cargo test --manifest-path native/terminal-host/Cargo.toml --lib overflow_menu_marks`: 1 passed.
- `npm run build:managed --silent` followed by `npm run typecheck`: passed.
- `npx vitest run test/integrations/pi/components/prompt-input-ux.test.ts`: 29 passed.
- `npx openspec validate improve-tab-overflow-menu --strict`: passed.
- Same native environment, `cargo test --manifest-path native/terminal-host/Cargo.toml --lib --quiet`: 311 passed, 1 ignored. The initial run exposed a clock-dependent test expectation; the test now accepts either legitimate 12-hour clock width, and the full rerun passed.
- Same native environment, `cargo test --manifest-path native/terminal-host/Cargo.toml --lib popup_mouse_targets_the_named_row --quiet` and `tabs_have_a_steady_width_then_shrink_and_truncate_before_overflow --quiet`: each passed after the refined assertions.
- `npx vitest run test/integrations/pi/components/prompt-input-ux.test.ts`: 31 passed, including dark/light model priority, tiny widths, clipped path/status rows, PR hyperlinks, ANSI color boundaries, and Pi comparison.
- `npx vitest run test/app/session-shell/session-shell-resident-footer.test.ts`: 1 passed.
- `npm run typecheck`, `npm run check:code-documentation`, `node scripts/governance/check-architecture.mjs`, `node scripts/pi/update-pinned-pi-source-ledger.mjs --check`: passed. The startup source budget remains unchanged; the strip size ratchet was lowered by one line.

## Gap disposition

For the earlier all-tab implementation, no remaining gap was known for terminals with room for both strip controls and popup rows. The hidden-only refinement still needs its own gap disposition. At zero to three columns, a distinct `+` and overflow target cannot coexist; `+` remains available. If the terminal has fewer body rows than popup entries, only physically drawn entries accept clicks; all ordered entries remain available to keyboard navigation. These are intentional geometry limits, not silently selectable invisible rows.
