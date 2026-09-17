## Context

See `proposal.md` for motivation. At planning base `35259d4a` every interactive quit route converges on `OwnedUiSessionShell.shutdown()`, which runs the backend quit workflow and then `#dispose()`. Disposal computes `fullscreenExitText` from the pinned `fullscreenExitOutput` setting (`transcript` by default: the styled transcript plus the resume hint), calls `runtime.dispose()` with no stop options, and finally writes that text with `writeAfterStop`.

`runtime.dispose()` reaches pinned `TuiAltScreen.stop({})`. Without `preserveScreen`, pinned `afterTerminalStop` renders the current document once more and writes every row into the parent terminal after `\x1b[?1049l`. For bare A1 that document is the fullscreen layout: empty viewport rows, the editor box, and the status footer. The user's screenshot shows exactly that dump followed by A1's transcript and hint.

The `v2` prototype (`D:/Backups/pi/v2/outro`) captured each committed frame, and on `session_shutdown` with reason `quit` painted a dissolve over the alternate screen through a synchronized-output block, held the alternate-screen leave until playback finished, and then revealed the shell once. Its prototype host also reset the pinned renderer before stop so nothing was dumped. Its effects are self-contained plan generators (`dissolve`, `fall`, `starburst`, `waves`) that turn per-row visible widths and a seed into sorted sparkle and clear cells; playback is a 30 fps loop that paints cells by absolute cursor position.

## Goals / Non-Goals

**Goals:**

- Reveal a parent terminal that contains no A1 frame rows, no transcript, and no partially cleared alternate-screen residue after any interactive quit.
- Play the selected outro effect on the alternate screen for a bounded duration before the single alternate-screen leave, for `/quit`, the second `Ctrl+C`, `Ctrl+D`, and extension shutdown alike.
- Keep the resume hint as the only post-restoration output, unchanged in wording, styling, and resume grammar.
- Make effect and duration profile-local A1 settings, with a prototype-faithful default.
- Preserve every existing restoration guarantee: one `\x1b[?1049h`/`\x1b[?1049l` pair, mouse reporting off, cursor shown, bounded shutdown, and prompt return without extra input.

**Non-Goals:**

- Changing `a1 pi`, pinned Pi, or installed Pi packages; the comparison profile keeps pinned `fullscreenExitOutput` behavior.
- Animating fatal exits, session replacement, `/reload`, non-TTY output, or the pinned regular mode.
- Porting the prototype's settings-screen preview button or its host surface-lease machinery.
- Making the outro interruptible or interactive; input received during playback is discarded by the existing stop-time drain.

## Decisions

### 1. Capture the presented frame from the damage-aware terminal adapter

Bare A1 already routes every frame through `DamageAwareTerminalAdapter`, which keeps the row-by-row content that was actually written to the terminal. The adapter will expose a read-only snapshot of the presented rows (ordered, with styles intact), and the shell will take that snapshot at the start of disposal, before any cleanup can repaint or clear. Rows are truncated to the current column count and their visible widths drive the effect plan, matching the prototype's capture contract.

Re-rendering the root layout at stop time is rejected: it can differ from what is on screen (overlays, hyperlink cleanup, transient status) and is exactly the dump this change removes.

### 2. Play the outro inside the shell's disposal, before the runtime stops

`#dispose()` will, after pointer reporting and pre-input cleanup and before `runtime.dispose()`, run the outro when the runtime is in fullscreen mode, stdout is a TTY, the effect is not `off`, and the captured frame has at least one non-blank row. Playback writes through a new runtime raw-paint entry that reaches the terminal without damage-frame arming or transformation; each tick is one synchronized-output block, as in the prototype. Playback is bounded by the configured duration, clamped to 300–2000 ms, plus one bounded overall guard; a rejected or thrown playback is swallowed so disposal continues with restoration.

A `session_shutdown`-style hook after `runtime.dispose()` is rejected because the alternate screen is already gone by then. Holding the pinned leave sequence hostage as the prototype did is rejected because A1 owns the stop ordering directly.

### 3. Stop with `preserveScreen` and emit only the resume hint on bare A1

The shell will pass `preserveScreen: true` to `runtime.dispose()` in fullscreen mode so the pinned runtime leaves the alternate screen without rendering its final document into the parent terminal. `fullscreenExitText` for bare A1 becomes the resume hint alone; `exitTranscript` remains available to the pinned comparison profile's `transcript` mode and for tests. The pinned `fullscreenExitOutput` effect definition becomes hidden for bare A1, following the existing `tuiMode` precedent, so the owned settings screen no longer offers a value that has no effect on this surface.

Defaulting the pinned setting to `resume-hint` is rejected: the value lives in Pi's own settings document, is shared with `a1 pi`, and the pinned getter cannot distinguish an unset value from a stored `transcript`.

### 4. Port the effects as deterministic plan modules with a seeded generator

The four prototype animations become TypeScript modules under the owned UI with the same `createPlan(rowWidths, seed)` contract, the same mulberry32 generator, and the same sparkle/clear scheduling so a fixed seed yields a byte-stable plan for tests. `off` skips capture and playback. The player clamps duration, paints `SYNC_BEGIN … SYNC_END` blocks at roughly 30 fps, and finishes with all cells cleared so the alternate screen is blank before the leave.

Loading `.cjs` files from disk at runtime, as the prototype did, is rejected: A1 ships a bundled `dist` and its startup budget and package inventory checks assume static imports.

### 5. Declare the settings through the owned settings system

`quitEffect` (`fall`, `dissolve`, `starburst`, `waves`, `off`; default `fall`) and `quitEffectDurationMs` (300 to 2000 in steps of 100; default 800) join `OWNED_UI_SETTING_DECLARATIONS` in a `Quit` section with `application: "live"`, since the shell reads them at quit time. The settings version advances with a no-op migration, as the prompt-suggestions addition did. The defaults follow the user's prototype configuration (`fall`, 800 ms) rather than the prototype code's `dissolve`, 850 ms default.

### 6. Verify ordering and terminal bytes deterministically, then physically

Shell tests will assert, on the recorded terminal bytes, that the outro's synchronized paints appear after the last frame and before the single `\x1b[?1049l`, that nothing but the resume hint follows the leave, that `\x1b[?1049h` never recurs, and that `off`, non-TTY, regular mode, and blank frames skip playback while still restoring. Plan tests will pin each effect's shape for a fixed seed. Settings tests cover declarations, defaults, migration, and section presentation; the graceful-quit fixture continues to prove process completion for both quit routes. A physical check on the user's terminal confirms the effect and the clean scrollback on the exact built candidate.

## Risks / Trade-offs

- **[Risk] The outro delays prompt return by up to two seconds.** → Clamp duration, default to 800 ms, offer `off`, and never wait past the clamp for a slow terminal.
- **[Risk] A partially painted animation could leak into scrollback if the leave happens mid-frame.** → Every tick is one synchronized-output block and the leave is written only after the player has resolved or been abandoned at its guard.
- **[Risk] The damage adapter's rows could be stale after a resize or a full clear.** → Truncate to the current viewport, treat an empty or all-blank capture as "skip", and keep the existing full-redraw invalidation rules untouched.
- **[Risk] Hiding `fullscreenExitOutput` breaks pinned-settings conformance.** → Use the existing hidden-effect path with its own evidence key, and keep the pinned profile's `transcript` behavior and tests intact.
- **[Trade-off] The transcript is no longer available in scrollback after quit.** → The resume hint restores the full session; this matches the user's request and the prototype.

## Migration Plan

Owned settings migrate forward with a no-op version step; absent values resolve to the declared defaults. No Pi settings document, session format, or public interface changes. Rollback is the ordinary code revert.
