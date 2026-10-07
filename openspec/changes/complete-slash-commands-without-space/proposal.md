## Why

Selecting a top-level slash command with Tab currently inserts a trailing space, so the prompt shows `/settings ` rather than the completed command `/settings`. Besides adding visual noise, that spacer prevents the user from immediately appending `:` for command tunnels such as `/skills:`.

## What Changes

- In bare A1, make Tab acceptance of a top-level slash-command suggestion complete to `/<name>` with the cursor directly after the command and no trailing space.
- Keep the command visible for further editing so the next keystroke can be `:`, a manually entered space for arguments, or another valid suffix.
- Preserve Enter submission, command ordering and filtering, argument/path/resource completion, extension-provider composition, and the pinned `a1 pi` comparison behavior.
- Add focused coverage for ordinary commands, commands with arguments, and the `/skills:` tunnel in both editor history modes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Make bare-A1 top-level slash-command Tab completion delimiter-ready by omitting the automatically inserted trailing space.

## Impact

- Affected areas: the bare-A1 autocomplete provider composition, the owned editor's declared tunnel-colon interception, focused shell/skills-tunnel tests, and corresponding copied-source/startup governance baselines.
- No command execution, keybinding, public API, dependency, configuration, session format, or installed Pi package changes are intended.
