## Why

The owned settings screen offers a `Quit` section with an `Effect` menu of four animations and an eighteen-step `Duration` menu, in addition to the `Exit animation` switch in `Generic`. The user wants only the switch: the quit outro is always the `fall` effect for 800 ms, so the `Quit` section is noise, and the switch should read `Quit animation` so its label matches what it controls.

## What Changes

- Remove the `Quit` settings section and its `quitEffect` and `quitEffectDurationMs` settings; bare A1 always plays `fall` for 800 ms when the animation is on.
- Relabel the `quitAnimation` switch in `Generic` from `Exit animation` to `Quit animation`, keeping its id, default, and live application.
- Advance the owned settings version with a migration that drops stored `quitEffect` and `quitEffectDurationMs` values, so an existing profile carries no orphaned keys.
- Narrow the quit outro settings contract to the switch alone; the shell supplies the fixed effect and duration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Remove the `Quit` section requirement, relabel the switch `Quit animation`, and migrate stored effect and duration values away.
- `custom-session-viewport`: The bare-A1 quit outro plays the fixed `fall` effect for 800 ms instead of a configured effect and duration.

## Impact

- Affected areas: owned settings declarations, migrations, and the settings index export; the quit outro settings snapshot in the owned-UI composition; the `OwnedUiQuitOutroSettings` contract; the session shell's quit capture; and the declarations, migrations, sections, settings-screen, and session-shell quit tests.
- Terminal contract: unchanged; the outro still plays inside the existing single alternate-screen enter/leave pair and the player, its effects, and its clamp are untouched.
- No dependency, session-format, keybinding, Pi settings document, or `a1 pi` behavior changes are intended.
