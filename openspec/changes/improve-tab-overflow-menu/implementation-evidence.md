## Implemented behavior

- The native chooser now builds rows from the complete shown-tab order, using the current strip frame's hidden IDs to check only the chips actually visible. A shown Settings tab is treated like any other shown tab; intentionally hidden Settings remains outside the strip and chooser.
- Each paint refreshes open chooser rows, order, checkmarks, anchor, and keyboard focus by stable tab ID. Removing or hiding a target clears that focus; losing overflow closes the chooser. Existing click, Enter, Escape, and view behavior remain.
- At constrained widths, strip controls and hit regions stay within the available columns. The `+` takes priority if fewer than four columns exist; from four columns onward an overflow control is available while tabs are hidden. The clock yields before controls. This is the physical minimum for distinct `+` and overflow targets and does not change ordinary-width placement.
- The A1 usage-footer's truncation marker is now a one-cell dim `…`, while Pi comparison rendering, linked PR badge, and non-truncated A1 text retain their previous behavior.

## Focused local checks

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_PREBUILT_VT=D:/Git/a1/.worktrees/tab-overflow-menu/.artifacts/terminal-vt cargo test --manifest-path native/terminal-host/Cargo.toml --lib roles::strip::tests`: 31 passed. The prebuilt terminal library was fetched from a CI-published, merged branch and verified by the native build.
- Same native environment, `cargo test --manifest-path native/terminal-host/Cargo.toml --lib core::attach::machine::tests`: 23 passed.
- Same native environment, `cargo test --manifest-path native/terminal-host/Cargo.toml --lib overflow_menu_marks`: 1 passed.
- `npm run build:managed --silent` followed by `npm run typecheck`: passed.
- `npx vitest run test/integrations/pi/components/prompt-input-ux.test.ts`: 29 passed.
- `npx openspec validate improve-tab-overflow-menu --strict`: passed.

## Gap disposition

No remaining implementation gap is known for a terminal wide enough to display both controls. In a terminal of zero to three columns, keeping both a distinct overflow target and the reserved `+` is geometrically impossible; the strip retains `+` and hides the overflow trigger until four columns exist. This minimum-width constraint is intentional, and the strip does not claim any hidden chip is visible.
