## 1. Declare the setting

- [ ] 1.1 Add `skillsPresentation` (`Skills`, Agent section, `collapse`/`expand`, default `collapse`, live) to `OWNED_SETTING_DECLARATIONS` after `promptSuggestions`, bump `OWNED_UI_SETTINGS_VERSION` to 7 with a no-op migration; verify declaration, migration, and manager tests cover the default, the version-6 upgrade, an invalid stored value, and the live change notification.
- [ ] 1.2 Extend the Agent-section projection and settings-app coverage; verify section tests show engine entries, then `Prompt suggestions`, then `Skills` in one Agent section, with the control editable when engine settings are absent or read-only, and settings-app search finds it.

## 2. Collapse the command list

- [ ] 2.1 Install the bare-A1 command list through a product-mode-aware step that, while collapsed and skill registration is enabled, replaces `skill:*` entries with one `skills` entry (`Browse, search, and apply a skill`, argument completions = skill names) and passes the withheld skills to the tunnel; verify autocomplete tests cover collapse, expand, disabled engine registration, the comparison profile, and a live switch refreshing the list without `/reload`.
- [ ] 2.2 Claim `/skills` in the session shell before the Pi fallback while collapsed: dialog for no arguments, direct application for a named skill (with or without `skill:`), `Unknown skill: <name>` outcome otherwise; verify shell tests prove `/skill:<name> args` reaches the engine via the ordinary prompt/steer path, an unknown name reports without opening the dialog, argument completion lists matching names or nothing, and `/skills` is not claimed in expand mode or the comparison profile.

## 3. Build the Skills dialog

- [ ] 3.1 Implement the A1-owned searchable Skills component behind `shell-selectors-dialogs.ts` on the public `#pi-tui` boundary with the model selector's composition (borders, spacers, input, list, pinned keybinding-hint footer) and the v2 content (title, `skill:<name>` rows, selected description, overflow counter, empty states); verify semantic-ANSI snapshots at narrow and wide widths, wrapping selection, query reset, `No matching skills`, `No skills yet`, and footer wording identical to the pinned selectors.
- [ ] 3.2 Present it through the shell overlay with owned input coordination and wire Enter/Escape to application and cancellation; verify shell tests cover apply-then-close, cancel leaving editor text and history untouched, focus restoration, resize, and exposed-transcript interaction under the modal.

## 4. Add the skills tunnel

- [ ] 4.1 Wrap the bare-A1 `CombinedAutocompleteProvider` with the tunnel-aware provider (`/skills:<query>` rows labeled `skills:<name>`, name/description substring matching, prefix stripping, null on no match, delegated `applyCompletion`/`shouldTriggerFileCompletion`); verify provider tests cover matching, empty results, slash-command application to `/skills:<name> `, extension wrappers composing over it, and no tunnel in expand or comparison profiles.
- [ ] 4.2 Add the owned editor's `:` completion for a selected `skills` row on a sole top-level slash search with undo snapshot and immediate re-trigger, and render the selected tunnel row's description muted through the owned list theme; verify editor tests cover `/sk` + `:`, undo, ordinary colons, and the row styling, with the `a1 pi` profile unchanged.
- [ ] 4.3 Rewrite a submitted `/skills:<name> rest` to `/skill:<name> rest` before the engine while recording the typed form in history; verify shell and history tests cover rest text, no rest, whitespace, an unknown name passing through, and recall restoring `/skills:<name> rest`.

## 5. Declare and validate

- [ ] 5.1 Record the collapsed menu, `skills` command, dialog, and tunnel as declared bare-A1 replacements in the parity evidence and keep expand/comparison surfaces compared against pinned Pi; verify parity and modal-inventory checks classify the new surfaces as expected and the comparison profile unchanged.
- [ ] 5.2 Update user documentation and the settings reference for `Skills`, `/skills`, and `/skills:`; verify documentation governance checks pass.
- [ ] 5.3 Obtain required CI results for the implementation candidate and hand off the built candidate with `./scripts/dev` for a manual check of collapse, expand, the dialog, `/sk` + `:`, `/skills:` filtering, and submission; verify the recorded manual result before requesting acceptance.
