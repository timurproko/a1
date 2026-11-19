## Why

The maintainer's 2026-10-19 resident multi-agent session hit a set of defects that make tabs feel broken next to `a1 solo`. Adding an Agent can leave an empty strip with a `! Input was not sent; try again.` row and a tab that never accepts input. A new Agent flashes a blank body, a stray cursor and its chip before the status bar and editor appear. The Settings tab is blank. Strip menus flicker while open. Changelog and other full-screen dialogs ignore arrows and Esc. The footer PR number is not clickable. Inline rename lacks word deletion and undo. Aborted and finished Agents are not marked clearly. The strip row has no background of its own.

## What Changes

- Never drop or refuse input while a newly created Agent starts. Pointer motion and focus reports no longer fill the deferred-input queue, overflow never shows a notice, and the `Input was not sent; try again.` notice row is removed entirely.
- Keep the previous coherent view until a new Agent's first drawn frame arrives. The cursor stays hidden until then and the chip reports its real lifecycle status, so the body, status bar, editor and chip appear together without flashing.
- Queue the `settings` route until the child presenter is running, so the Settings tab always shows the owned Settings screen.
- Composite strip popups into the presented rows instead of repainting child rows under them every frame, so an open context, overflow or `+` menu stays stable while Agents stream.
- Add Ctrl+Delete / Ctrl+Backspace whole-word deletion and Ctrl+Z undo / Ctrl+Y redo to inline rename. Control-modified letters are never inserted as text.
- Deliver a lone Esc to the child immediately instead of holding it as a possible controller-boundary prefix. Owned dialogs decode keys by meaning rather than legacy byte equality, so arrows, Esc and Ctrl+C work in resident dialogs exactly as in solo.
- Preserve OSC 8 hyperlinks on every resident presentation path, so the footer PR number is a clickable link as in solo.
- Show a red `✗` when an Agent's last run was aborted or failed and a green `✓` when it finished. The marker stays on the chip, including after viewing, until that Agent starts its next run.
- Paint the whole strip row with a solid dark background behind chips, `+`, padding and clock. Never leave stale or palette-derived cells to the right of `+`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: tab status markers, invisible lifecycle input handling, inline rename editing, stable popups, strip row background, resident dialog keys, footer hyperlinks, and Settings content.

## Impact

- Native attach input queueing, notice/overlay composition, view commit gating, strip rendering, rename editor and status glyphs under `native/terminal-host/src/roles/` (`attach.rs`, `presentation.rs`, `strip.rs`, `server.rs`, `holder.rs`) and legacy frame composition in `native/terminal-host/src/ghostty.rs`.
- TypeScript resident bridge and owned UI: `src/foundation/resident-tabs/bridge-client.ts`, `src/composition/owned-ui.ts`, `src/features/resident-tab/status-deriver.ts`, `src/app/session-shell/session-shell.ts`, and owned dialog key handling (`src/features/owned-ui/reference-screen-app.ts`, `src/app/session-shell/shell-host.ts`).
- Focused Rust unit tests and TypeScript tests. Native tests run in CI only; local checks are typecheck, touched TypeScript tests and the contracts-only cargo check.
- Out of scope:
  - The maintainer's personal pi `multiagent` and `modes` extensions under `~/.pi/agent/extensions/`. Their `shift+tab` conflict warning and their `gpt-5.5` child model are not a1 code.
  - `a1 solo` and `a1 pi` behavior.
  - New settings.
