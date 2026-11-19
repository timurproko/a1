## Context

Resident tabs run the child in a holder-owned Windows ConPTY. The holder parses ConPTY's re-rendered output with Ghostty, captures retained rows, and the attach composer repaints changed rows in the outer terminal. Solo mode writes the child's frames directly to the outer terminal.

ConPTY tracks its renderer cursor one column past the right edge when the child's cursor rests after the final column. If a render pass ends there, ConPTY emits an erase and a cursor-forward that overshoots the final column. The next pass returns with a backspace before writing the final cell. A standard parser clamps the cursor-forward, so the backspace lands one column left and the final cell, such as a scrollbar rail glyph, is drawn beside a blank gutter.

## Goals / Non-Goals

**Goals:**

- Keep every resident rail cell in the final gutter column, matching solo mode.
- Leave ordinary backspaces and all other cursor movement unchanged.

**Non-Goals:**

- Replacing the system ConPTY or changing how the child renders.
- Changing retained capture, row damage, or composer output.

## Decisions

### 1. Repair at the holder's parser boundary

The holder is the only component that sees ConPTY's byte stream before Ghostty clamps it. Splitting writes at each cursor-forward lets the holder read Ghostty's cursor column first and record how far ConPTY meant to move past the final column. Alternatives considered: changing the child to avoid resting its cursor in the final column cannot control where ConPTY splits a pass, and patching retained rows after capture would have to guess which cell moved.

### 2. Drop only the cancelling backspaces

After an overshooting cursor-forward, the holder drops at most that many immediately following backspaces. SGR and synchronized-output markers may separate them because they never move the cursor. Any other byte ends the overshoot, so unrelated backspaces stay intact.

### 3. Windows only

Unix PTYs relay child bytes verbatim, so the repair is enabled only on Windows.

## Risks / Trade-offs

- [A cursor-forward split across two PTY reads is not recognized] → The repair then behaves exactly as before for that one sequence; such splits are rare because ConPTY writes each pass in one operation.
- [Extra parser writes per cursor-forward] → One additional FFI write and cursor read per cursor-forward, which is small next to row capture.

## Migration Plan

No settings, protocol, or data changes. Rolling back removes the repair and restores the previous behavior.
