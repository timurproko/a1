# Implementation evidence

## 1. Hidden resident renderers keep advancing

- 1.1: `OwnedUiTerminalHost` no longer has `setPresentationVisible` or a visibility presentation hold. `requestRender` gates only on the active presenter, so a hidden resident tab's renderer schedules and writes frames exactly as a viewed one does. `beginPresentationHold` remains for its existing short-lived users (session switches and modal transitions), which this change does not touch.
- 1.2: `composeOwnedUi` no longer tracks resident visibility or applies it to the terminal host, and `bindResidentTabBridge` drops its `onVisibility` option. `TabBridgeClient` still decodes `bridge.visibility` and emits the `visibility` command, and the native server still sends it, so generation-1 peers stay compatible. The command now has no effect in the child. Status reporting, rename, stop, controller-boundary input, and the direct `a1 solo` / `a1 pi` paths (no tab bridge, where the removed apply was already a no-op) are unchanged.
- 1.3: no native change. `holder.rs` drains every PTY read into the holder's Ghostty terminal on each loop pass whether or not it is subscribed (`terminal.write` in the `output_rx` drain). It offers a `surface` only when `subscribed`, and on `surface.subscription { enabled: true }` it marks the terminal dirty and offers a forced complete frame (`frame_at(0, 1, true)`). The server unsubscribes a tab's holder when no client views it and subscribes the newly viewed tab. Section 2 has the regression that pins this.

## 2. Concurrent background presentation

- 2.1: `test/app/session-shell/shell-host.test.ts` replaces the "holds hidden resident presentation" case with "keeps a resident tab streaming into its terminal with no visibility gate to defer it". On a resident shell it asserts that the host exposes no visibility control. It also asserts that a streamed `message_start` and a later `message_update` delta each reach the terminal writes before the next step, with no full redraw, so nothing is held back for a catch-up repaint.
- 2.2: `test/composition/resident-tabs.test.ts` "accepts host visibility without pausing the tab or interrupting status reporting" sends visibility false then true around busy/idle lifecycle events and requires `working` then `idle` status with no rename or stop. `test/foundation/resident-tabs/resident-tabs.test.ts` still decodes `bridge.visibility` into the `visibility` command (compatibility), and the existing "keeps a detached presenter live without painting" case still covers detached-presenter gating. The new native integration test `an_unviewed_tab_keeps_its_terminal_current_and_presents_it_in_full_when_viewed` (`native/terminal-host/tests/role_integration.rs`, using the new `progress` fake-tab mode) does three things:
  - creates an unviewed tab while a client views another tab, then waits for the child's marker file, which proves the child produced output while nobody viewed it;
  - requires that client's output to stay free of that tab's text, which proves inactive surfaces are withheld;
  - attaches a viewer to the tab and requires its first surfaces to contain the line and the in-place counter produced while the tab was unviewed, which proves selection shows a complete, current surface.

## 3. Pre-ready evidence

**Local (2026-10-15, maintainer's Windows workstation):**

- `npm run typecheck`: passed.
- `npx vitest run test/app/session-shell/shell-host.test.ts test/composition/resident-tabs.test.ts test/foundation/resident-tabs test/integrations/pi/session-presenters test/integrations/pi/tui-runtime/adapter.test.ts test/app/session-shell/session-shell-lifecycle.test.ts test/app/session-shell/session-shell-resident-recovery.test.ts`: 16 files, 149 tests passed.
- `npx --yes @fission-ai/openspec@1.8.0 validate --all --strict --no-interactive`: 35 passed.
- Native, contracts-only (this workstation must not run the Zig build): `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --all-targets --features resident-fixtures` passed, which type-checks `role_integration.rs` and the `fake-tab` fixture. `rustfmt --check --edition 2024` on both edited files passed. The native integration test runs only in CI; its result is recorded below.
- `npm run preflight` on `2d12930c` (implementation merged with `origin/develop` at `1cd3afe8`): passed.

**Dispatched CI run:** Development validation [run 38780430821](https://github.com/timurproko/a1/actions/runs/38780430821) on `2d12930c` succeeded. All three native terminal-host lanes (Linux x64, macOS arm64, Windows x64) report `an_unviewed_tab_keeps_its_terminal_current_and_presents_it_in_full_when_viewed ... ok`. The resident-tabs chaos lanes on all three platforms, the rendering validation, and the PR core and affected unit owners also passed.

**Known gaps:** none. The two-tab manual check below is left for maintainer review; automated coverage does not replace it.

**Diff review (3.2):** the change removes only the child-side visibility hold and its composition wiring, and adds tests plus a fake-tab mode. It changes no protocol message, generation, or fixture; no native product code; no tab-status derivation; no input routing or controller boundary; and no direct-mode behavior.

**Manual check:** run `./scripts/dev`, open a second tab, and start a long streaming prompt in each. Switch to the other tab while the first is still streaming, wait a few seconds, then switch back. The first tab should show its current streamed content at once, with no burst of delayed frames, and its working status indicator should have stayed current the whole time.
