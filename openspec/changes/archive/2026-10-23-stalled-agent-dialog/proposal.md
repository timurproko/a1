## Why

When a resident Agent stalls (no model or tool progress for five minutes) or stops answering heartbeats, the resident UI reports it in two unrelated places: the attach client paints a plain `! Agent stalled · R restart · Alt+W close` row under the tab strip, and the session shell appends `No progress for 5 min — Esc interrupts · use the tab restart action to restart` to the transcript. Neither looks like an A1 dialog, the restart is a bare `R` keystroke the user has to read about, and the transcript line stays behind after the stall is resolved.

## What Changes

- Replace both notices with one centered modal dialog that the attach client draws over the viewed tab: the title `Agent stalled`, one line explaining the state, the options `Restart` and `Close` with no shortcut labels, and A1's standard dialog footer. `↑`/`↓` move the selection, `Enter` runs it, `Esc` dismisses the dialog for that stall, and clicking an option runs it.
- Dim the complete presented surface, strip and tab body, while the dialog is open, in the same way A1's in-session modals dim the transcript, and restore it when the dialog closes.
- Remove the session shell's `No progress for N min` transcript line. The stalled status still reaches the strip glyph and the dialog.
- Retire the bare `R` restart key for stalled tabs; `Alt+W` close keeps working.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: a stalled or unresponsive viewed tab opens a centered Restart/Close dialog over a dimmed surface instead of a notice row and a transcript line.

## Impact

- Native attach client: `native/terminal-host/src/core/attach/` (a new dialog mode beside popup, rename, and drag), `native/terminal-host/src/roles/attach.rs` (dialog rendering, stalled key handling), `native/terminal-host/src/roles/presentation.rs` and `strip.rs` (dimmed composition).
- Session shell: `src/app/session-shell/resident-tab-coordinator.ts` stops appending the stall transcript line; its tests change accordingly.
- Out of scope: the failed-tab banner (`Tab failed · R retry · F start fresh · Alt+W close`), the stall and unresponsive timings, automatic restarts, and `a1 solo` behavior.
