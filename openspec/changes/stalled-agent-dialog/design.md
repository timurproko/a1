# Design

## Context

Stall detection stays where it is: the session shell's resident tab coordinator arms a timer per working tab and reports `stalled` through the bridge; the server records it on the tab's surface and the attach client sees it as `tab.status`. Heartbeat loss is reported by the server as `unresponsive`. Today the attach client turns either status into a notice row (`roles/attach.rs`, `overlay`), maps a bare `r`/`R` to `Request::Restart` (`core::attach::State::forward_key`), and the coordinator appends a transcript line.

The attach client already has a pure interaction state machine with one `Mode` (idle, popup, rename, drag), a positioned-ANSI overlay channel that the presentation composer clips child rows around, and a structured cell surface whose styles are emitted per cell. The dialog uses those three mechanisms; no wire protocol, registry, or timing changes.

## Decisions

### 1. The dialog is a fourth attach interaction mode

`core::attach` gains `Mode::Dialog(ActionDialog)`. `ActionDialog` holds the target tab id, the status it answers (`stalled` or `unresponsive`), a title, one message line, its options, and the selected index. It is pure data with `move_selection(delta)`, `option_at(column, row)`, and `selected()`.

Opening: whenever a step leaves the viewed tab's status at `stalled` or `unresponsive` and the mode is idle, the state opens the dialog for that tab. That covers the status change itself, a view change onto a stalled tab, and reattach. A dialog never replaces an open popup, rename, or drag; it opens on the next idle step.

Closing: the dialog closes when its tab's status leaves `stalled`/`unresponsive`, when the viewed tab changes or the tab is removed (the existing `cancel_prompt` rule), or when the user answers or dismisses it.

Dismissal: `Esc` closes the dialog and records `(tab id, status)` as dismissed, so the dialog does not reopen for the same stall. It reopens when the status leaves and returns, or when the user views the tab again after viewing another one. `Esc` is consumed by the dialog; it is not forwarded to the child. A second `Esc` reaches the child and interrupts the turn as before.

Keys: `Up`/`Down` move the selection; `Enter` runs the selected option; every other key is swallowed, except the tab actions resolved by `TabBindings` (for example `Alt+W` close, `Alt+1` jump), which keep working as they do over a popup. Mouse: hover over an option selects it, a click on an option runs it, a click elsewhere does nothing. Paste is dropped while the dialog is open.

Actions: `Restart` emits `Effect::Send(Request::Restart(tab))`, the same request the `R` key sent. `Close` runs the existing `close` path (`Request::Close` with the close fallback), the same as the context menu's Close, so a working stalled tab still gets the busy-close confirmation.

The stalled-tab `r`/`R` arm of `forward_key` is removed. The failed-tab rules are unchanged.

### 2. Rendering follows A1's modal frame

The role renders the dialog as a positioned ANSI overlay, like popups and the drag marker, so the presentation composer keeps child rows stable beneath it. The frame mirrors the TypeScript `PiModalFrame`: a top rule of `─` in the border tone, the title in bold, a blank row, the muted message, a blank row, one row per option, a blank row, the footer hints, and a bottom rule. Option rows are `→ Restart` / `  Close`; the selected row is painted with the selection background used by A1's lists and the accent foreground. The footer is `↑↓ navigate  Enter select  Esc close` with dim keys and muted names; no option carries a shortcut label.

Width is the larger of the content and 44 columns, clamped to the terminal width minus two; the box is centered horizontally and vertically within the child rows below the strip (rows 2 and onward). On a terminal too short for the frame, rows are dropped from the message downward and the options and footer stay. Truecolor and the 256-colour fallback both have fixed tones, chosen beside the existing popup palette (`38;38;38` surface, `110;110;110` muted) rather than read from the child's theme, because the attach client has no theme channel.

### 3. The surface dims as one presentation flag

`DesiredPresentation` gains `dim: bool`, set while `Mode::Dialog` is active. The composer treats a dim change as a complete repaint. While dim, `set_style` passes every cell's foreground and background through one `dim_color` helper: an RGB colour is blended 55 percent toward the terminal's dark base, a palette colour is kept and the cell adds SGR 2 (faint), and a default colour adds SGR 2. The strip is rendered through the same helper by giving `strip::render_interactive` a `dim` parameter, so chips, clock, and `+` dim together with the body. The dialog overlay itself is painted after the dimmed rows and is not dimmed. The legacy raw-byte fallback body has no cell styles; there the body is repainted with a leading SGR 2 and the overlay on top, which is the same approximation the fallback already accepts for popups.

### 4. The transcript line goes away

`ResidentTabCoordinator.observeProgress` keeps the timer and `reportStatus("stalled")`, but no longer calls `appendWorkflowStatus`. The recovery transcript lines (recovered prompt, recovered draft) are untouched.

## Risks

- Dimming the strip changes bytes that strip hover and drag hit tests derive from. The hit tables are built from cell positions, not colours, so the `dim` parameter must change only SGR parameters; the strip tests compare hit tables with and without dim.
- Terminals that render SGR 2 as a colour change rather than opacity will show palette-coloured cells slightly differently from RGB cells. All owned A1 themes emit RGB, so the mixed case is limited to child content from external tools.
- `Esc` no longer interrupts a stalled turn on the first press while the dialog is open. The footer says `Esc close`, and the second press behaves as before.
