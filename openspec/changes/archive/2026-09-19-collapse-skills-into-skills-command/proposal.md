## Why

Every discovered skill is registered as its own `/skill:<name>` command, so a profile with many skills fills the slash-command menu with entries that crowd out the built-in and extension commands the user is usually looking for. The proven `D:/Backups/pi/v2` skills extension solves this with one `/skills` command that opens a searchable dialog, plus a `/skills:` command tunnel that lists every skill inline without leaving the editor. Bare A1 has no equivalent, and no setting lets the user choose between the compact and the expanded presentation.

## What Changes

- Add the persisted A1 setting `skillsPresentation`, labeled `Skills`, to the settings screen's existing `Agent` section after `Prompt suggestions`, with the values `collapse` (default) and `expand`, applied live.
- When `Skills` is `expand`, keep the pinned behavior: every `/skill:<name>` command appears in the slash-command menu as it does today and no `/skills` command exists.
- When `Skills` is `collapse`, hide the `/skill:<name>` entries from the top-level slash-command menu and offer one bare-A1 `skills` command, described `Browse, search, and apply a skill`, whose bare invocation opens a searchable Skills dialog presented like the model selector and modeled on the v2 extension: title, search input, `skill:<name>` rows, the selected skill's description, an overflow counter, `No matching skills` / `No skills yet`, and the pinned selector hint footer. Enter applies the selected skill through the ordinary prompt path so Pi expands it exactly as a typed `/skill:<name>` would; `/skills <name> [args]` applies a named skill directly, an unknown name is reported like any other command's bad argument, and `/skills ` argument completion lists matching skill names or nothing.
- Add a `skills` command tunnel to the bare-A1 editor while `Skills` is `collapse`: `/skills:<query>` lists every matching skill as `skills:<name>` with its description without opening the dialog; typing `:` while `skills` is the selected top-level command completes to `/skills:` and reopens the menu; a submitted `/skills:<name> rest` is rewritten to `/skill:<name> rest` before it reaches Pi, and prompt history keeps the typed form.
- Follow the engine's existing `Skill commands` setting: when Pi does not register skills as commands, neither the `skills` command, the tunnel, nor the expanded entries are offered, and changing either setting refreshes the menu live without `/reload`.
- Leave the `a1 pi` comparison profile, installed Pi packages, and the engine's own `/skill:<name>` expansion untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Declare the `skillsPresentation` setting, its Agent-section placement after `Prompt suggestions`, its defaults, and its stored-version migration.
- `owned-pi-ui-foundation`: Declare the collapsed `skills` command, the Skills dialog, and the `skills` command tunnel as bare-A1 replacements for the per-skill command listing, and require the expanded mode and the comparison profile to preserve pinned behavior.

## Impact

Implementation will primarily affect the owned settings declarations and migrations, the Agent-section projection, the shell's slash-command autocomplete list and provider composition in `shell-editor-autocomplete.ts`, the owned editor's `:` handling while the command menu is open, the session shell's slash-command dispatch and prompt-history recording, and one new A1-owned searchable dialog component behind `shell-selectors-dialogs.ts` built on the public `#pi-tui` boundary. Pi's resource catalog keeps discovering skills; only the bare-A1 presentation of the resulting commands changes.

No engine execution, provider protocol, session persistence, or Pi settings storage changes. Installed Pi packages, their exported constructors, and their prototypes are not mutated. The `a1 pi` comparison route keeps its pinned command catalog and below-prompt menu. This change contains planning artifacts only, not implementation.
