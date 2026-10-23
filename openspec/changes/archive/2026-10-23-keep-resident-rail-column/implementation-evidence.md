## Divergent boundary

The shift starts in Windows ConPTY's re-render, before the resident terminal model sees any bytes.

Session-shell frames recorded at 122 columns were replayed through the system ConPTY. When a render pass ended while the child's cursor rested after the final column, ConPTY emitted an erase and a cursor-forward that overshoots the last column. The next pass returned with a backspace before the final cell:

```
pass 1:  ... number 56?ESC[K ESC[79C          cursor 44 + 79 = column 123 on a 122-column screen
pass 2:  ESC[38;2;104;183;141m BS ┃ ESC[m
```

ConPTY tracks its cursor one column past the right edge, so it expects the backspace to land on column 122. A standard parser clamps the cursor-forward at column 122, so the backspace lands on column 121. The rail glyph is drawn there and column 122 stays blank. The resident model, retained capture, and composer then reproduce that row faithfully, and the shift persists until the row changes again. Solo mode writes straight to the outer terminal and never passes through this re-render.

Checks that ruled out other boundaries:

- ConPTY, Ghostty, and Windows Terminal all measure the rail, arrow, ellipsis, prompt, and spinner glyphs as one cell.
- The same recording at 60 columns produced no overshoot, so the existing 60-column replay test could not see it.
- Composer output for recorded states survives a second ConPTY pass unchanged.

## Repair

The holder now splits its parser writes at each cursor-forward on Windows. It records how far ConPTY meant to move past the last column and drops that many immediately following backspaces. Only SGR and synchronized-output markers may separate them. Any other byte ends the overshoot, so ordinary backspaces are untouched.

## Focused checks

Run locally against the CI-published terminal library already present in the primary checkout's ignored artifacts, with `TERMINAL_HOST_LOCAL_BUILD=1`:

- `cargo test --lib`: 286 passed, 1 ignored.
- `conpty_split_render_pass_keeps_the_rail_in_the_final_column` covers the exact split sequence, with and without the repair.
- `recorded_conpty_output_never_shifts_the_rail`, fed the 122-column ConPTY recording, finds four shifted-rail states with the repair disabled and none with it enabled.

Clippy is not installed in the local toolchain, so lint runs in CI.
