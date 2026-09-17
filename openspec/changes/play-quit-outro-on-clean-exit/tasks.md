## 1. Clean Restoration

- [ ] 1.1 Add session-shell tests that record terminal bytes for `/quit` and the second `Ctrl+C` in bare A1 and assert nothing but the dim resume hint follows the single `\x1b[?1049l`; verify they fail against the current frame dump and transcript emission.
- [ ] 1.2 Stop the fullscreen runtime with `preserveScreen` and emit only the resume hint on bare A1 while the pinned comparison profile keeps its `fullscreenExitOutput` behavior; verify the new tests pass and existing restoration, resume-grammar, and graceful-quit fixtures remain green.
- [ ] 1.3 Mark the pinned `fullscreenExitOutput` effect hidden for bare A1 with its own evidence key; verify settings conformance and the owned settings screen omit the row while `a1 pi` parity fixtures are unchanged.

## 2. Outro Effects

- [ ] 2.1 Port `dissolve`, `fall`, `starburst`, and `waves` as deterministic TypeScript plan generators sharing the prototype's cell contract and seeded generator; verify fixed-seed plan tests pin each effect's cell ordering, bounds, and non-empty output for representative geometries.
- [ ] 2.2 Implement the bounded player: initial frame paint, ~30 fps synchronized-output ticks, 300–2000 ms clamp, blank-frame skip, and swallowed failures; verify player tests against a recorded terminal cover completion, clamp boundaries, and no writes after the guard.

## 3. Quit Integration

- [ ] 3.1 Expose the presented-row snapshot from the damage-aware terminal adapter and a raw-paint runtime entry that bypasses damage arming; verify adapter tests show snapshots match written rows and raw paints are neither transformed nor recorded as frames.
- [ ] 3.2 Run the outro in shell disposal before the runtime stops for every interactive quit route, skipping regular mode, non-TTY output, `off`, and blank captures; verify byte-order tests place the paints after the last frame and before the only alternate-screen leave, with no repeated enter.

## 4. Settings

- [ ] 4.1 Declare `quitEffect` and `quitEffectDurationMs` in a `Quit` section with defaults `fall` and 800, advance the owned settings version with a no-op migration, and read them at quit time; verify declaration, default-resolution, migration, section, and live-read tests pass.

## 5. Validation

- [ ] 5.1 Run the focused session-shell, tui-runtime, owned-settings, settings-conformance, and graceful-quit scopes plus typechecking; record passing evidence or explicitly disposition every observed gap before finalization.
- [ ] 5.2 Hand off the exact built candidate for a physical check of the outro effect and the clean parent terminal on the user's terminal for both quit routes; record the outcome.
