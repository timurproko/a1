## Why

Turning the quit outro off today means opening the `Quit` section, which is listed after `Scroll` and `History`, and choosing `off` from the same `Effect` menu that selects an animation. The user wants a dedicated on/off switch for the exit animation in a `Generic` section that opens the settings screen, so that switching the animation off is one obvious toggle and quitting then returns to the terminal immediately.

## What Changes

- Declare a boolean `quitAnimation` setting labeled `Exit animation` in a new `Generic` section that is the first section of bare A1's settings screen, defaulting to on.
- When the toggle is off, every interactive bare-A1 quit route skips frame capture and playback and leaves the alternate screen immediately; the `Effect` and `Duration` values are retained but ignored.
- Remove `off` from the `quitEffect` choices so the effect menu offers only animations (`fall`, `dissolve`, `starburst`, `waves`); the toggle is the single way to disable playback.
- Advance the owned settings version with a migration that maps a stored `quitEffect` of `off` to `quitAnimation: false` and the default effect, so an existing profile keeps its behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Declare the `Generic` section with the `quitAnimation` toggle ahead of every other section, narrow `quitEffect` to animation choices, and migrate a stored `off` effect into the toggle.
- `custom-session-viewport`: Bare A1 quit skips the outro when the exit-animation toggle is off instead of when the effect is `off`.

## Impact

- Affected areas: owned settings declarations, migrations, and section grouping; the quit outro settings snapshot in the owned-UI composition; the session shell's quit capture gate; the `OwnedUiQuitOutroSettings` contract; and the declarations, migrations, sections, settings-screen, and session-shell quit tests.
- Terminal contract: unchanged; the outro still plays inside the existing single alternate-screen enter/leave pair when it plays at all.
- No dependency, session-format, keybinding, Pi settings document, or `a1 pi` behavior changes are intended.
