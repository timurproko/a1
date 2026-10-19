# Design

## Context

See `proposal.md` for motivation. Each item below was traced in source on `072bcdf1`. Some are confirmed in code; the others are labelled as likely or unconfirmed.

The resident UI has two rendering owners:

- The Rust attach client owns the strip, popups, notices and input queueing, and composes the final outer frame.
- Each TypeScript child renders its own body inside a holder's libghostty terminal. The holder publishes complete surfaces through the server.

## Findings and decisions

### 1. Input during Agent creation (confirmed mechanism)

**Finding.**
- The attach client enables any-motion mouse reporting (`attach.rs:40`) and forwards every motion over the body to the child (`attach.rs:2685`).
- After `+ → Agent` it sets `pending_created_activation` (`attach.rs:1627`). All input then goes into `DeferredInput`, capped at 64 frames (`attach.rs:49`, `:1082`), until the new tab's first frame commits.
- Moving the pointer off the popup overflows that cap within moments. Every later push fails, including keystrokes, and sets `transient_notice = "Input was not sent; try again."` (`attach.rs:1492`). That notice is painted over child row 2 (`render_notice`, `attach.rs:416`).
- The same notice is also set when a queued frame resolves to a different target (`:1683`), when the requested tab disappears (`:1903`), and on a server `input.rejected` (`:2117`).

**Decision.**
- Forward pointer motion only when the child's mouse mode requests motion tracking.
- While a view is pending, never queue motion. Focus reports coalesce to the latest one.
- Key and paste frames keep the existing exactly-once controller boundary. Overflow beyond the byte/frame budget is refused before any prefix, as the lifecycle requirement already demands, but it never paints a notice.
- Remove the `Input was not sent` notice and its four producers. A server `read-only-viewer` rejection re-claims input for the viewed tab and replays the refused frame once, without a notice.

### 2. Flashing when an Agent is created (confirmed path)

**Finding.**
- When the holder connects, the server subscribes it (`server.rs:4107`).
- The holder answers with its current frame at revision 0 before the child has drawn anything (`holder.rs:857`). That frame carries a hard-coded `"idle"` status.
- The attach client commits this frame as the answer to the pending view request (`presentation.rs:142-198`, `attach.rs:1654`), and the tab change forces a full clear (`presentation.rs:360`).
- The result is a blank body without footer or editor. The cursor is shown at whatever position ConPTY left it (`presentation.rs:456`). The chip flips `starting → idle → real status`.

**Decision.**
- A requested newly created tab commits only a frame whose child has drawn (revision > 0 and non-blank). Until then the prior coherent view stays, input stays bound to the new target as today, and the cursor stays hidden.
- A bounded fallback (2 s, matching the existing stale-surface wait) commits whatever exists, so a child that never draws cannot wedge the view.
- The holder reports its bridge status rather than a literal `"idle"`.
- A geometry-generation change at identical dimensions does not force a full clear.

### 3. Settings tab is blank (confirmed)

**Finding.**
- The server sends `bridge.route {route:"settings"}` once after bridge admission (`server.rs:5206`).
- `owned-ui.ts` binds the bridge before `application.start()` runs `presenter.start()`. The route reaches `#openOwnedRoute` while the terminal is not yet running, and the call returns `"runtime is not active"` (`session-shell.ts:1765`). The result is discarded (`:1830`) and the server never resends.

**Decision.** The session shell keeps one pending owned route when the runtime is not active, reusing the existing startup-route path (`#startupRoute`/`#presentStartupRoute`), and presents it once `start()` completes. A failed route result is logged through the existing diagnostics path instead of being dropped.

### 4. Popup flicker (confirmed)

**Finding.**
- `PresentationComposer::prepare` re-emits the popup whenever any body row changed (`presentation.rs:426`). That happens on every streamed child frame.
- First it repaints the covered child rows in full, ending in `\x1b[K` (`render_surface_row`, `:595-648`). Then it paints the popup on top.
- Terminals that do not honor DEC 2026 synchronized output show the blank-then-paint step as a flash.

**Decision.**
- Composite popup cells into the desired row model before diffing, so every outer cell is written once per frame with its final content.
- Rows under an unchanged popup emit only the changed child columns outside the popup.
- The legacy body path clips its writes to the same rectangle.

### 5. Inline rename editing (confirmed)

**Finding.**
- `attach.rs:2250` inserts any non-control `Char` regardless of modifiers, so Ctrl+Z inserts `z`.
- Backspace and Delete (`:2231-2232`) ignore Ctrl.

**Decision.**
- Add `delete_word_left`/`delete_word_right` to `RenameEditor`, reusing the grapheme-safe boundaries of `move_word_left/right`. Bind them to Ctrl+Backspace (including the `Ctrl+H`/`Ctrl+W` encodings) and Ctrl+Delete.
- Add bounded undo/redo stacks of `(text, cursor, anchor)`. Consecutive typed characters coalesce into one step. Bind Ctrl+Z to undo and Ctrl+Y / Ctrl+Shift+Z to redo.
- `Char` insertion requires no Ctrl or Alt modifier.

### 6. Dialog keys in resident tabs (A confirmed, B likely)

**Finding A.** `owned-ui.ts:418` routes every input through `consumeControllerBoundaryInput`. That function holds back any suffix that could begin `\x1bP+a1;controller=` (`bridge-client.ts:154-165`). A lone Esc always matches, so it is withheld until the next key and then glued to it.

**Finding B.** Inside the holder, pi-tui negotiates the kitty keyboard protocol with libghostty, so Esc arrives as `\x1b[27u`. Owned screens compare legacy bytes (`reference-screen-app.ts:57-70`, `shell-host.ts:446`).

**Decision.**
- Hold back only once at least `\x1bP` is buffered. A lone trailing Esc is delivered at once.
- Owned dialog hosts (reference screens, Settings app, UI app host, the shell interrupt check) decode input with pi-tui's `matchesKey`/`parseKey`, so legacy and kitty encodings produce the same action.
- Regression fixtures send both encodings to the Changelog screen.

### 7. Footer PR link (unconfirmed path)

**Finding.**
- The footer always wraps the PR number in an OSC 8 hyperlink (`session-footer.ts:48`).
- The structured surface path retains and re-emits links (`ghostty.rs:1011`, `presentation.rs:617`).
- The legacy `compose_frame` (`ghostty.rs:1573`) writes style and text only, and it is used when a viewer lacks `structured-surface`.
- ConPTY may also strip OSC 8 before the holder sees it (`holder.rs:867` notes similar OSC loss).

**Decision.**
- Emit OSC 8 from `compose_frame` using the same cell hyperlink lookup as the structured path.
- Add a holder fixture that writes an OSC 8 footer through the platform PTY and asserts the link reaches the outer frame.
- If the Windows ConPTY fixture proves the link is stripped before parsing, the child sends links to the holder over the existing bridge side channel for the footer row only. That is recorded as a design refinement before coding it.

### 8. Tab status markers (confirmed; behavior chosen by the maintainer)

**Finding.**
- `owned-ui.ts:589` treats an aborted turn as not failed, so its tab returns to idle with no glyph.
- `✓` is shown only for an unviewed settled tab and is cleared on view (`server.rs:1650`).

**Decision.**
- The bridge reports the last settlement as `done`, `aborted` or `failed`. New statuses `done` and `aborted` are added to the TypeScript status union, the deriver, the server allowlist and `status_glyph_at`.
- `done` renders green `✓`. `aborted` and `failed` render red `✗`, as do process-level crash/end.
- Per the maintainer (2026-10-19), the marker persists after viewing until that tab's next turn starts. The view-clears-`✓` rule is retired.

### 9. Strip row background (confirmed)

**Finding.** Chips use 38/48/55 grey, but padding and the clock are plain spaces after `\x1b[0m` (`strip.rs:582-588`). They inherit the outer default background, which the child palette sync (OSC 11) can change. That is one plausible source of the stray colored cells right of `+`; stale legacy body bytes reaching row 1 are another.

**Decision.**
- Paint the whole row with a fixed dark background, RGB `20,20,20` with a 256-color fallback. Chips keep their lighter backgrounds.
- Each chip reset is followed by the row background, and the row ends with an erase under that background.
- The strip is re-emitted whenever legacy body bytes were written, and legacy body output is clipped to rows ≥ 2.

## Risks / Trade-offs

- **[Waiting for a drawn first frame delays the new tab]** → The bounded 2 s fallback keeps the view from waiting forever. Input is still accepted and delivered once.
- **[Dropping motion while pending loses hover in the new child]** → The next motion after commit restores it. Clicks and key input are never dropped.
- **[Persistent `✓`/`✗` changes an accepted v2 rule]** → Explicitly chosen by the maintainer. The requirement text is updated rather than layered with a contradicting addition.
- **[ConPTY OSC 8 behavior is unproven]** → A fixture decides it before any side-channel work.
- **[Native code cannot be built locally on this machine]** → Rust changes rely on focused unit tests run in CI. TypeScript and contracts-only cargo checks run locally before push.

## Out of scope

- The maintainer's personal pi `multiagent`/`modes` extensions. Their `shift+tab` binding collides with pi's reserved `app.thinking.cycle`, and their daemon starts children on `gpt-5.5`. A1 does not generate `~/.pi/cache/multiagent/child-dirs`.
- The gradient strip band in the extension's screenshots. The maintainer chose a solid dark row instead.
