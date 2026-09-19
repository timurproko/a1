## Why

Opening `/settings` in bare A1 briefly shows a `Loading settings…` line before the settings module finishes loading, so the screen flashes a message that carries no value and is gone a frame later. The user wants the screen to open straight into its rows with nothing shown in between.

## What Changes

- Render the deferred settings surface as a blank frame while its module loads; only a load failure still prints its message.
- Render the settings application's empty body as blank while its session is still loading; `No settings found.` remains for a session that loaded nothing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Opening the settings screen shows no loading placeholder; the frame stays blank until the rows render or a load failure is reported.

## Impact

- Affected areas: the deferred settings surface in the owned-UI composition, the settings application's empty-state render, and their tests.
- No dependency, settings-format, keybinding, Pi settings document, or `a1 pi` behavior changes are intended.
