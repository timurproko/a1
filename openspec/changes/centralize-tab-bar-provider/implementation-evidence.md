# Implementation evidence

## Provider contract

- `native/terminal-host/src/core/tab_bar.rs` is the single native declaration for Agent, Settings, and Changelog metadata and policies.
- Attach activation, command-palette entries, plus-menu entries, context-menu renameability, singleton visibility/prewarming, registry validation, Agent-session ownership, singleton reservation, and child route delivery consume provider declarations.
- Singleton visibility state is stored in provider order rather than concrete Settings and Changelog fields.

## Ordering

- `append_live_tab` appends cold-created and promoted standby tabs after the final live record without consulting kind.
- `move_live_tab_last` places a hidden singleton at the final live slot when it joins the strip; already shown tabs bypass it and retain dragged order.
- Focused server regressions cover Agent → Settings → Agent ordering, dragged order, singleton message resolution, and stopped records around live tabs.

## Prompt replacement

- `SessionViewportController` leaves editor-owned prompt word and line selection highlighted without producing a copy-on-select snapshot; complete-frame selection still follows the live setting.
- The owned editor's existing asynchronous paste reservation replaces the retained selection from the unchanged clipboard, while explicit `Ctrl+C` still submits the selected editor text and applies its established collapse behavior.
- Shell coverage starts with `replacement` in the clipboard, double-clicks `copy` in `copy this line`, and observes `replacement this line` without an intervening clipboard write.

## Native dialog hints

- `native/terminal-host/src/roles/shortcut_hints.rs` renders reusable `{ key, action }` entries with shared display casing, semantic key/action roles, two-space entry gaps, and grapheme-safe terminal-cell clipping.
- Commands and Plus Menu declare semantic entries and pass them through the shared renderer; their footer no longer owns literal separator strings.
- Truecolor uses distinct quiet-key and lighter-muted action colors, while 256-color fallback uses separate palette roles. Palette coverage asserts the visible text, ANSI role boundaries, fallback colors, and absence of middle-dot separators.
- Component coverage exercises shared casing and spacing plus narrow-width clipping across a wide grapheme without emitting a partial style span.

## Local checks

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --tests` passed.
- A focused `rustc --test` harness over the checked-in shortcut-hint and command-palette modules passed all 5 component and palette tests.
- `npm run build:core` passed.
- `npm run typecheck` passed after the prompt-selection refinement.
- `npm run check:architecture` passed after lowering the three function-size ratchets exposed by exact-head CI and the prompt controller reduction.
- `npx vitest run test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/session-shell-selection.test.ts` passed with 151 tests.
- `npx openspec validate centralize-tab-bar-provider --strict` passed.
- The full native unit binary could not link locally because the contracts-only build omits the Ghostty VT symbols and no trusted Windows `terminal-vt` artifact or Zig toolchain was available; exact-head CI remains the native validation authority.
