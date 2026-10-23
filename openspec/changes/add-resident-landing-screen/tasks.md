# Tasks

Each numbered section is one Implementation item. Every section starts by merging current `origin/develop` and re-checking the names below. Native tests run in CI; focused Rust unit tests also run locally with `cargo test --lib` in `native/terminal-host` when the toolchain is present.

## 1. Landing presentation

- [x] 1.1 Add `native/terminal-host/src/roles/landing.rs`: a pure renderer that takes columns, body rows, accent name, cwd, effective shortcut labels, and the editor view, and returns legacy body bytes plus the cursor position. Lay out the three-row half-block `a1` wordmark, one blank row, the ruled prompt box (`─` rules in the accent-derived border color, the owned `❯ ` prefix in muted, the dim `Ask anything…` placeholder when empty, up to six wrapped rows that keep the cursor row visible), and one row with the shortened cwd left and the `alt+a new agent · alt+, settings` hints right, all centred vertically and horizontally at `min(columns - 4, 72)` columns. Drop the wordmark, then the hint row, when rows run out; render nothing but the box below three body rows. Tests: fixed-width cell fixtures at 80x24, 40x8, 200x60, and 20x5; placeholder versus text; wrapping and cursor-row scrolling; palette fallback; Apple Terminal wordmark text fallback.
- [x] 1.2 Add the accent table for the landing: per-accent dark `accent` and `border` RGB mirrored from `derivePiAccentProjection` beside the existing `accent_selected_background`, read from the same profile settings watch, defaulting to purple. Tests: a TypeScript test prints the projection for every accent and the Rust table is asserted against those bytes.
- [x] 1.3 Present the landing from `roles/attach.rs` whenever no tab is shown and no view is requested: the landing bytes become the frame's legacy body with its cursor as the final cursor, the strip stays unchanged, and clock ticks, hover, popups, and notices compose over it as today. Tests: attach presentation fixtures for last-tab-close, hidden-Settings close, the `+` launcher popup over the landing, and resize.

## 2. Landing input

- [x] 2.1 Generalize `RenameEditor` into a shared `LineEditor` in `core/attach/mod.rs` that keeps cursor motion, Home/End, Backspace/Delete, word motion and deletion, Ctrl+A, undo/redo, and insertion, and add multi-line insertion for paste; rename keeps its single-line use. Tests: the existing rename editor tests pass through the shared type; paste with line breaks; byte bound.
- [x] 2.2 Add `State.landing` to `core/attach/machine.rs`: while no tab is shown, printable keys and paste edit the landing instead of forwarding; `Esc` clears; one `Ctrl+C` clears and the role's existing double-`Ctrl+C` window still detaches; `Enter` with text sends `Request::CreateWithPrompt(text)` and enters the pending state that keeps the text, shows the progress spinner in the prefix, and ignores edits; `Created` keeps the text until the first draw commits and then clears it; `CreateFailed` restores editing with the notice. Tab shortcuts, the `+` launcher, popups, and mouse on the strip behave exactly as before. Tests: unit tests for every transition, bound refusal with notice, and the simulator corpus reaching the landing, pending, and failed states with one paint per change.
- [x] 2.3 Send `tab.create` with `initialPrompt` from `Request::CreateWithPrompt` in `roles/attach.rs`, bounded to 64 KiB. Tests: wire encoding with and without the field.

## 3. Seeded Agent creation in the host

- [x] 3.1 Add optional `initial_prompt` to `wire::TabCreate` and a `seed_pending` flag to `core::server::TabRuntime`. In `lifecycle.rs` `tab.create` and `standby.rs` promotion, write `seed-prompt.json` (`{"schema":"a1-tab-seed-prompt-v1","text":...}`) owner-only into `<data-dir>/tabs/<profile>/<tab-id>/` with the recovery-artifact writer before the holder starts or the promotion is announced; a write failure refuses creation with `tab.create-failed`. Delete the file when the tab is closed, stopped, or fails before consumption. Tests: unit tests for file placement, permissions, refusal, and cleanup.
- [x] 3.2 Send a content-free `bridge.seed` frame to a tab's bridge on admission while `seed_pending`, and immediately on standby promotion when the bridge is connected; clear the flag when the child reports consumption through `bridge.seed-consumed`. Advertise `bridge-seed` in the welcome features and add both fixtures to `protocol/fixtures.json`. Tests: server unit tests for fresh and promoted tabs, fixture round trips, and the welcome feature.

## 4. Seed consumption in the Agent tab

- [ ] 4.1 Add `src/foundation/resident-tabs/seed-prompt.ts`: read the bounded seed file from the tab data directory, validate the schema, delete it, and return the text; absent or invalid files return nothing. Decode `bridge.seed` into a `seed` command and send `bridge.seed-consumed` in `bridge-client.ts`. Tests: reader fixtures and bridge decoding/encoding.
- [ ] 4.2 Consume the seed in `resident-tab-bridge.ts` at bind time and on the `seed` command, and hand the text to the presenter through a new `submitSeededPrompt` that submits through the ordinary `submit` path once the shell is ready and no startup route or dialog holds the screen, exactly once. Tests: composition tests for startup and promoted-standby timing, retained-until-ready, and single submission.

## 5. Architecture record

- [ ] 5.1 Record the landing and the seed-file delivery under Decision 11 in `docs/architecture/resident-tabs.md` and cross-reference the bridge no-content rule.
