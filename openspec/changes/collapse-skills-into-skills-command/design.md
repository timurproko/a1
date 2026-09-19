## Context

See `proposal.md` for motivation. The planning base is `f8e8d4ef` on `develop`.

- `src/integrations/pi/engine/resource-catalog.ts` derives the slash-command autocomplete list: builtin `model`/`login`, prompt templates, one `skill:<name>` entry per discovered skill while Pi's `enableSkillCommands` is true, then extension commands. The session shell installs that list through `editor.setAutocompleteCommands()` at start and after every resource refresh.
- `src/integrations/pi/components/shell-editor-autocomplete.ts` merges the pinned builtin command table with those entries into one `CombinedAutocompleteProvider` and owns the bare-A1 editor construction, including the above-prompt menu placement, the sole-slash-search Escape exception, and the `addAutocompleteProvider` seam extensions use to wrap the provider.
- `src/app/session-shell/session-shell.ts` dispatches slash input: owned routes claimed by the route host, then pinned workflow routes, then everything else is remembered as `slash` history and sent to Pi as a prompt. Pi's `AgentSession` expands `/skill:<name> args` itself, independently of `enableSkillCommands`, which only governs menu registration.
- Owned settings live in `src/ui/settings/declarations.ts` (version 6). `promptSuggestions` is the precedent for an A1 setting presented inside the engine-derived `Agent` section: `sections.ts` appends owned Agent entries after the engine descriptors.
- Shell dialogs such as the model selector are built in `shell-selectors-dialogs.ts` on the public `#pi-tui` boundary and presented through `runtime.showOverlay` with `inputCoordination: "owned"`; the viewport keeps exposed transcript content interactive under every modal.
- `D:/Backups/pi/v2/skills/index.ts` and `core/editor/command-tunnel.ts` are the behavioral reference: a `skills` command with a search modal, a `CommandTunnel` whose `hideGlobalValuePrefixes` removes `skill:` entries from the global menu, `/skills:<query>` inline suggestions, `:` completion of the selected `skills` command, and an input transform from `/skills:<value> rest` to `/skill:<value> rest`.

## Goals / Non-Goals

**Goals:**
- Let the user choose between a compact `skills` command and the expanded per-skill command list, defaulting to compact.
- Reproduce the v2 skills dialog and tunnel interaction in bare A1 through owned code on public boundaries.
- Keep Pi as the sole authority for skill discovery and expansion; A1 only re-presents the commands Pi offers.
- Keep the `a1 pi` comparison profile and untouched pinned Pi observably unchanged.

**Non-Goals:**
- Changing how skills are discovered, ordered, expanded, or rendered in the transcript.
- Adding a generic multi-tunnel extension API; the tunnel is a shell-owned facility for the `skills` command only.
- Replacing the engine's `Skill commands` setting or moving `skillsPresentation` into Pi settings storage.
- Mutating installed Pi packages, their prototypes, or the pinned `CombinedAutocompleteProvider`.

## Decisions

### 1. `skillsPresentation` is an owned Agent-section choice, not an engine setting

Declare `skillsPresentation` in `OWNED_SETTING_DECLARATIONS` with label `Skills`, the existing `agent` section, allowed values `collapse` and `expand`, default `collapse`, and `live` application. Bump `OWNED_UI_SETTINGS_VERSION` to 7 with a no-op forward migration, matching how `promptSuggestions` and the quit settings were introduced. The section builder already appends owned Agent entries after engine descriptors in declaration order, so declaring it after `promptSuggestions` yields `Prompt suggestions` then `Skills` with no second Agent section.

The engine's `Skill commands` toggle keeps its pinned meaning: when it is off, Pi offers no skill commands and A1 has nothing to collapse or expand, so no `skills` command, tunnel, or entries appear. Putting the choice under the engine's descriptor set was rejected because A1 must not write Pi settings storage and the value has no engine effect.

### 2. Collapse is applied at the shell's autocomplete boundary

Keep `resource-catalog.ts` emitting `skill:<name>` entries exactly as today. In bare A1 with `collapse`, the shell's command-list installation replaces every `skill:`-prefixed entry with one owned `skills` entry (`Browse, search, and apply a skill`) whose argument completions are the skill names, and hands the withheld skills to the tunnel. In `expand`, and always in the comparison profile, the list is installed unchanged and no `skills` entry exists. A setting change re-runs the same installation so the menu refreshes live, as the existing `enableSkillCommands` refresh already does.

Editing the pinned builtin table or the engine catalog was rejected: the builtin table is pinned Pi vocabulary shared with the comparison route, and the catalog is engine-side and product-mode unaware.

### 3. The tunnel wraps the bare-A1 provider and the owned editor's `:` key

Wrap the `CombinedAutocompleteProvider` in `shell-editor-autocomplete.ts` with an owned provider that, for a single-line top-level `/skills:<query>` before the cursor, returns `skills:<name>` items with muted one-line descriptions filtered by case-insensitive name or description substring (a leading `skill:` or `skills:` in the query is ignored for name matching); returns no menu when nothing matches; and otherwise delegates unchanged. Because collapse already removed `skill:` entries from the installed list, no post-filtering of global results is needed. Applying a tunnel item uses the pinned slash-command application, producing `/skills:<name> ` with the cursor after the space.

The owned editor gains one bare-A1 input exception: when the command menu is open on a sole top-level slash search whose selected item is `skills`, a typed `:` replaces the search with `/skills:`, pushes an undo snapshot, and re-triggers autocomplete so the tunnel list opens immediately. Every other `:` keystroke is ordinary text. This mirrors v2's `tryCompleteSelectedCommandTunnel` but lives in owned editor code rather than in a prototype patch. The `addAutocompleteProvider` seam keeps working: an extension wrapper composes over the tunnel-aware provider.

The selected tunnel row keeps its description muted rather than accent-highlighted (v2's `renderItemWithMutedSelectedDescription`). This is implemented through the owned list theme/facade, not by patching `AutocompleteList`.

### 4. Submission rewrites the tunnel form; Pi expands the skill

In `#slashCommand`, before the Pi fallback and only in bare A1 with `collapse`: `/skills:<name>` followed by optional whitespace and rest is rewritten to `/skill:<name><rest>` and sent through the ordinary prompt/steer path so Pi's own `_expandSkillCommand` builds the skill block. History records the user's typed `/skills:<name>` form, satisfying the persistent-history rule that recall restores the invocation rather than the expansion. `/skills` and `/skills <text>` are claimed by the shell: no arguments opens the dialog; a first token naming a skill (with or without a `skill:` prefix) applies it directly with the remaining text as arguments; any other first token is an unknown skill and is reported as an `Unknown skill: <token>` command outcome, the way `/model` reports an unknown model, without opening or seeding the dialog. Argument completion for `/skills ` behaves like every other command's: matching skill names are listed while the typed prefix matches, and nothing is shown when none matches. An unknown name after `/skills:` still reaches Pi, which passes unknown skills through untouched, matching the pinned behavior for a typed `/skill:unknown`.

Rebuilding the skill block in A1 (v2's `buildSkillPrompt`) was rejected: Pi already owns that expansion and its transcript rendering of skill blocks.

### 5. The Skills dialog is an owned overlay component on the public `#pi-tui` boundary

Add one A1-owned searchable list component behind `shell-selectors-dialogs.ts`, presented exactly like the model selector: the same overlay geometry and `inputCoordination: "owned"`, the same pinned composition of `DynamicBorder`, spacer, `Input` search line, spacer, list container, spacer, `DynamicBorder`, and the same keybinding-hint footer the pinned selectors use (`↑↓ navigate`, confirm `select`, cancel `cancel`) instead of v2's bullet-separated hint string. Its content follows v2's `EditorSearchModal`: the accent bold title `Skills` above the search line, rows labeled `skill:<name>` with the selected row prefixed `→ ` in accent, the selected skill's one-line description in muted text below the list where the model selector shows `Model Name:`, the pinned `(n/total)` scroll counter when rows exceed the visible window, `No matching skills` for an empty filtered result and `No skills yet` when no skills exist. Up/Down wrap around; Enter applies the selected skill; Escape and the pinned cancel binding cancel and leave the editor text unchanged; typing edits the query and resets the selection to the first row.

The dialog never opens seeded: it is reached only by `/skills` with no arguments, so selection applies the skill with no extra arguments. Arguments belong to the direct form `/skills <name> [args]`.

Building the dialog as a `UiAppHost` app was rejected: the app host offers no prompt-submission service and is designed for standalone screens, whereas this is a transient selector like the model dialog. Reusing v2's `EditorModal` package was rejected because it is not part of this repository's runtime boundary.

### 6. Declared replacement, comparison profile untouched

The collapsed menu, the `skills` command, the dialog, and the tunnel are declared bare-A1 replacements for the per-skill command listing; the expanded mode and `a1 pi` are the pinned baseline. Parity evidence classifies the collapsed surfaces as expected deviations and keeps comparing the expanded and comparison surfaces against pinned Pi.

## Risks / Trade-offs

- A skill name containing whitespace or characters outside the tunnel pattern cannot be tunneled. Mitigation: such skills remain reachable through the dialog and `/skills <name>`; the tunnel pattern follows v2 (`[A-Za-z0-9][A-Za-z0-9_-]*` after the colon, no whitespace).
- Users who typed `/skill:<name>` from memory still get Pi's expansion in collapse mode even though the menu no longer lists it. This is intended: collapse changes presentation, not acceptance.
- Extension autocomplete wrappers registered through `addAutocompleteProvider` see tunnel suggestions as ordinary suggestions. Mitigation: the tunnel provider preserves the provider interface exactly, including `applyCompletion` and `shouldTriggerFileCompletion`.
- Rendering the muted selected description needs the owned list theme rather than pinned `AutocompleteList` internals. If the public theme cannot express it, the row keeps pinned selected styling and the deviation is recorded in evidence rather than patched in.

## Migration Plan

Stored owned settings migrate from version 6 to 7 with a no-op migration; profiles without `skillsPresentation` resolve to `collapse`. No Pi settings, session files, or history entries change shape. Rolling back leaves the stored key unread, which the existing unknown-setting tolerance already handles.
