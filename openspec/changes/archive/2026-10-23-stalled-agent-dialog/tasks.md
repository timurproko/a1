# Tasks

Markers report current implementation progress. Native Rust tests run in CI. Before each push, run the typecheck, the touched TypeScript tests, and the contracts-only cargo check.

## 1. Stalled-Agent action dialog

- [x] 1.1 Add `ActionDialog` and `Mode::Dialog` to `core::attach`: open when the viewed tab is stalled or unresponsive and the mode is idle, close on status change, view change, or tab removal, remember an `Esc` dismissal per tab and status, move the selection with `Up`/`Down`, run `Restart` (`Request::Restart`) or `Close` (the existing close path) with `Enter` or a click, and drop paste while open.
- [x] 1.2 Remove the stalled-tab `r`/`R` arm from `forward_key` and the `Agent stalled · R restart · Alt+W close` notice; keep the failed-tab banner and keys unchanged.
- [x] 1.3 Render the dialog in `roles/attach.rs` as a centered positioned overlay with A1's modal frame: rules, bold title, muted message, `→`-marked options with the selection background, and the `↑↓ navigate  Enter select  Esc close` footer, in truecolor and 256-colour forms, clamped to narrow and short terminals.
- [x] 1.4 Rust tests: the dialog opens on a stalled status and on viewing a stalled tab, closes on recovery and on a view change, stays closed after `Esc` for the same stall, `Enter` on each option sends the right request, a click on an option runs it, the render contains the title, both options, the footer, and no shortcut labels, and the simulator keeps one mode at a time.

## 2. Dimmed surface under the dialog

- [x] 2.1 Add `dim` to `DesiredPresentation`, set it while the dialog mode is active, treat a dim change as a full repaint, and pass structured cell colours through one `dim_color` helper (RGB blended toward the dark base, palette and default colours with SGR 2); dim the legacy raw-byte body with a leading SGR 2.
- [x] 2.2 Give `strip::render_interactive` a `dim` parameter that routes its colours through the same helper, leaving hit tables unchanged.
- [x] 2.3 Rust tests: a dim frame repaints every row with dimmed styles and the overlay undimmed, clearing the dialog repaints the original styles, and the strip's hit table is identical with and without dim.

## 3. Session shell transcript line

- [x] 3.1 Stop appending `No progress for N min — …` in `ResidentTabCoordinator.observeProgress`; keep the timer, `reportStatus("stalled")`, and the render request.
- [x] 3.2 TypeScript tests: the coordinator reports `stalled` after the notice interval and appends no workflow status; the recovery lines are unchanged.
