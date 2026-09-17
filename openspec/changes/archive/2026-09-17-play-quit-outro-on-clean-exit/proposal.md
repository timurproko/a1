## Why

Quitting bare A1 with `/quit` or the second `Ctrl+C` leaves the parent terminal full of agent content: the pinned fullscreen runtime dumps its final frame (blank viewport rows, editor box, and status footer) into the scrollback, and A1 then appends the styled conversation transcript before the resume hint. The user wants the parent terminal to contain only its own output after quit, and wants the quit outro effect from the `v2` prototype, where the final frame dissolves on the alternate screen before the shell is revealed.

## What Changes

- Play a bounded quit outro on the alternate screen for every interactive bare-A1 quit route (`/quit`, the second `Ctrl+C`, `Ctrl+D`, extension shutdown): capture the last presented frame, animate it with the selected effect, then leave the alternate screen exactly once.
- Port the four prototype effects (`dissolve`, `fall`, `starburst`, `waves`) as deterministic plan generators, with playback clamped to 300–2000 ms and an `off` choice.
- Stop dumping the final fullscreen frame into the parent terminal on quit, and stop printing the conversation transcript there: bare A1 prints only the dim `To resume this session:` hint after restoration.
- Declare `quitEffect` and `quitEffectDurationMs` as profile-local A1 settings in a `Quit` section, defaulting to the prototype's `fall` at 800 ms.
- Hide the pinned `fullscreenExitOutput` row from bare A1's settings screen, because the transcript variant is no longer variable on this surface; `a1 pi` keeps pinned behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Bare A1 quit plays a bounded outro on its fullscreen surface and restores a parent terminal that contains no A1 frame or transcript.
- `owned-ui-settings`: Declare the quit effect and duration settings.
- `pi-settings-runtime`: Scope pinned `fullscreenExitOutput` transcript emission to the pinned comparison profile; bare A1 emits only the resume hint.

## Impact

- Affected areas: owned session-shell disposal ordering, the Pi TUI runtime stop path (`preserveScreen`), the damage-aware terminal adapter (presented-frame capture), a new outro module under the owned UI, owned settings declarations/migration/sections, pinned settings effect metadata, and the session-shell, settings, runtime, and graceful-quit tests.
- Terminal contract: the alternate screen is entered and left exactly once per session as today; the outro only adds paints between the last frame and the leave.
- No dependency, session-format, keybinding, or `a1 pi` behavior changes are intended.
