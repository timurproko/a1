# Implementation evidence

Implementation continued in the linked `E:/Git/a1/.worktrees/multiagent-ui-polish` worktree and draft PR #808 after the maintainer reported the resident tab defects on 2026-10-19 and requested fixes. The maintainer tried the build by hand, accepted the behavior, and asked to finalize.

## Results

- Creating an Agent no longer loses input to pointer motion, focus reports or queue overflow, and the `Input was not sent; try again.` notice row and its producers are removed.
- A newly created or first-viewed tab is committed only with its first drawn frame (2 s fallback), with the cursor hidden until then, so the body, status bar, editor and chip appear together.
- The Settings tab keeps a route that arrives before startup and shows Settings once started. `Alt+,` toggles it: hidden Settings stays running, is prewarmed in the background, and never surfaces by itself. Inside the tab, Settings offers no Esc close.
- Strip popups are composited into the presented rows. Hover uses the accent-derived background, and shortcut labels are dimmed.
- Inline rename supports Ctrl+Backspace/Ctrl+Delete word deletion and Ctrl+Z/Ctrl+Y undo/redo, and never inserts control letters.
- A lone Esc reaches the child immediately, and owned dialogs decode legacy and kitty keys, so Changelog and Settings respond like solo.
- Legacy frames keep OSC 8 hyperlinks, so the footer PR number stays a link.
- Finished turns show a green ✓, and aborted or failed turns a red ✗, until the next turn. Glyph changes are debounced so titles do not jump.
- The strip row has a solid dark background, shows the clock even with no tabs, and is re-emitted after legacy body writes. Unset child colors keep the outer theme instead of turning black.
- Double Ctrl+C detaches from any tab, including Settings and Shift-reported Ctrl+C, and plays solo's `fall` quit outro when enabled.
- New tabs are named `Agent`. Auto-generated names are recorded as `auto` (camelCase wire field) and play the v2 rainbow title animation.
- Every running tab rereads the shared settings document on change, so live settings such as the accent color apply to all Agents.
- `npm run build` and `./scripts/dev` stop this checkout's own stale A1 processes first, unless `A1_DEV_KEEP_PROCESSES=1` is set.

## Validation

- `npm run typecheck` passed.
- `npx vitest run` over 23 touched test files (resident tabs, shared settings watch, settings manager, Settings app, resident-tab features, resident-tab bridge, stop-checkout-processes, reference screens, settings route host): 255 tests passed.
- Native `cargo test --lib` with the prebuilt VT library: 198 passed, 1 ignored. `cargo fmt --check` passed.
- `npx openspec validate polish-multiagent-tab-ux --strict` and `node scripts/governance/check-architecture.mjs` passed. The startup-graph baseline was raised for the added resident tab code.

## Known gaps

None. Rejection replay, the geometry-generation clear, legacy-path clipping and the ConPTY hyperlink fixture are deferred by refinement, as recorded in the design's Refinements section, and are not part of the delivered outcomes.
