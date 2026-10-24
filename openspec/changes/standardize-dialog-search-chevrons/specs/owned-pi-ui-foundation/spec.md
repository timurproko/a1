## MODIFIED Requirements

### Requirement: Bare A1 declares shared input and status-level presentation
Bare A1 SHALL use the shared input presentation and status-level color behavior as an explicit A1-owned customization over the pinned shell. The ordinary main user prompt SHALL render one blank cell before its `❯` marker, followed by the existing marker-to-content spacing. Bare-A1 standard dialog search inputs SHALL render exact ASCII `> ` before their caret or query, with the `>` resolved through the live semantic accent role. Marker-free full-screen application search and compact non-search text-entry inputs SHALL continue using the reusable rules, caret, placeholder, and content geometry without a dialog marker. This customization SHALL supersede pinned editor border coloring and thinking-label styling only in bare A1; it SHALL render shared input rules through the same active semantic `border` role as modal bars and SHALL NOT change pinned `a1 pi` presentation, extension-provided custom editors, engine semantics, or other footer values. Bare-A1 keyboard defaults SHALL follow the declared level-cycle and model-selector shortcut policy instead of pinned defaults.

#### Scenario: Open the pinned comparison profile
- **WHEN** the user starts `a1 pi`
- **THEN** editor thinking-level and bash-mode border colors, footer presentation, Shift+Tab level cycling, Ctrl+L model selection, and input prefixes SHALL retain pinned behavior

#### Scenario: Use the owned agent input
- **WHEN** the user starts bare A1 with its default agent editor
- **THEN** the input SHALL use the shared modal-border rules and render exactly one blank cell before the `❯` prompt marker
- **AND** prompt history, paste chips, selection and copy, suggestions, streaming, submission, and bash execution SHALL retain their existing semantics

#### Scenario: Use a standard dialog search input
- **WHEN** a bare-A1 standard dialog offers typing-based search
- **THEN** its input SHALL render exact ASCII `> ` with the `>` in the active semantic accent role
- **AND** focus, editing, filtering, submission, cancellation, IME placement, clipping, and pointer geometry SHALL remain unchanged

#### Scenario: Use an auxiliary Agent input
- **WHEN** an A1-owned Agent standard selector or dialog offers typing-based search
- **THEN** the input SHALL render exact ASCII `> ` with the `>` in the active semantic accent role
- **WHEN** full-screen Settings search or an explicitly marker-free compact non-search text-entry surface requests the shared input presentation
- **THEN** the input SHALL render its caret, placeholder, and text without an agent or dialog prompt marker
- **AND** each surface's existing focus, editing, submission, and cancellation behavior SHALL remain unchanged

#### Scenario: Change the owned accent live
- **WHEN** the active bare-A1 accent changes while the default agent editor or a standard dialog search input is visible
- **THEN** shared input rules SHALL repaint with the same derived border tone as modal rules
- **AND** a visible standard-dialog `>` SHALL repaint with the new semantic accent
- **AND** the input SHALL retain its text, cursor, selection, focus, prefix choice, and geometry

### Requirement: Searchable dialog typing guidance uses shortcut roles

Bare A1's Models, legacy model selector, scoped-model configuration, Skills, Thinking Level, Resume Session, Session Tree, login provider, and logout provider dialogs SHALL render exact ASCII `> ` before their typing-based search field, with the `>` in the active semantic accent role. The Models, Skills, Thinking Level, Resume Session, and Session Tree dialogs SHALL continue presenting their typing guidance as the exact visible text `Type search`. `Type` SHALL use the shared quiet key role, and `search` SHALL use the shared action-text role used by neighboring shortcut hints. Resume Session MAY additionally present its query grammar as quiet placeholder text inside its empty search field and consolidate its shortcut guidance into one row. These presentation changes SHALL NOT alter filtering semantics, keybindings, focus, cursor placement, prompt width, input clipping, or the pinned `a1 pi` comparison profile; every other covered dialog SHALL retain its established input and hint order, spacing, and width handling.

#### Scenario: Read and identify a searchable dialog
- **WHEN** any declared bare-A1 standard searchable dialog is visible
- **THEN** its search field SHALL begin with exact ASCII `> `
- **AND** the `>` SHALL use the active semantic accent role while the query retains its established text and caret roles

#### Scenario: Read typing guidance in a searchable dialog
- **WHEN** the ordinary Models, Skills, Thinking Level, Resume Session, or Session Tree dialog is visible
- **THEN** its shortcut guidance SHALL include `Type search`
- **AND** `Type` SHALL use the key role while `search` uses the action role
- **AND** the remaining hints SHALL retain the order and behavior declared for that dialog

#### Scenario: Read Resume Session query grammar
- **WHEN** Resume Session is visible with an empty search query
- **THEN** its query grammar SHALL appear as quiet placeholder text after the accent `> ` marker rather than as shortcut entries
- **AND** `Type search` SHALL remain the first footer entry

#### Scenario: Change the dialog accent live
- **WHEN** the active accent changes while a standard searchable dialog remains open
- **THEN** its `>` marker SHALL repaint from the live accent role without clearing or moving the query or caret

#### Scenario: Use the comparison profile
- **WHEN** a corresponding searchable surface is presented through `a1 pi`
- **THEN** its pinned wording and presentation SHALL remain unchanged
