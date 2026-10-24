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

### Requirement: Bare A1 unifies model selection and scope management
Bare A1 SHALL expose one `/models` command for selecting the active model and managing the model scope used by cycling. Bare A1 SHALL NOT advertise or execute `/model` or `/scoped-models` as compatibility aliases. The pinned `a1 pi` comparison profile SHALL retain its existing `/model` and `/scoped-models` routes and presentations.

The Models dialog SHALL use the available authenticated model catalog and SHALL present an `all` filter and a `scoped` filter, searchable model rows ordered by provider and model identifier, the selected model's display name, and the effective model-scope state. Each row SHALL render its scope marker before the model identifier and its provider as `[provider]`. A filled scope marker `●` SHALL use the semantic accent foreground matching Thinking Level's filled default radio marker `◉`, while an empty scope marker `○` SHALL remain dim. The active-model checkmark SHALL remain success-colored and render immediately after `[provider]`, not before the provider or in another column.

Space SHALL toggle the selected model's membership in the session's cycling scope without closing the dialog. Tab SHALL switch the filter while preserving the applicable query and selection. Enter SHALL select the highlighted model, persist it as the default through the existing model-selection policy, and close the dialog on success. Existing bulk-enable, clear, provider-toggle, and scope-order actions SHALL remain reachable through their effective model-scope bindings. Escape SHALL close silently while retaining session-only scope changes and SHALL NOT persist those changes implicitly.

The dialog SHALL compare its current scope and order with the last successfully saved scope. Whenever they differ, the title row SHALL read `Models (unsaved)`, with `(unsaved)` immediately after the title. Ctrl+S SHALL persist the current scope and order while leaving the dialog open; only a successful save SHALL clear `(unsaved)`. An empty explicit scope SHALL preserve the existing all-model cycling fallback.

Catalog refresh SHALL run in the background without adding `(refreshing)` to the title or rendering a progress or successful-completion sentence in the dialog body. A successful refresh SHALL silently update available rows while preserving the user's query, surviving selection, pending scope edits, and dirty state. Timeout and failure outcomes SHALL keep the same state and remain visible as actionable bounded warning details in the body without changing the title.

#### Scenario: Advertise the unified bare-A1 command
- **WHEN** bare A1 builds its slash-command catalog
- **THEN** `/models` SHALL be advertised as the model selection and scope-management command
- **AND** `/model` and `/scoped-models` SHALL not be advertised or accepted
- **AND** `a1 pi` SHALL retain its pinned command catalog unchanged

#### Scenario: Open the Models dialog
- **WHEN** the user invokes `/models` with available authenticated models
- **THEN** one dialog titled `Models` SHALL open with `all` and `scoped` filters, a search input, model rows, the selected model's display name, and model-management instructions
- **AND** an argument supplied to `/models` SHALL seed the search query rather than selecting an inexact model silently

#### Scenario: Render scope and active-model state
- **WHEN** a model row is rendered
- **THEN** its filled accent-colored or empty dim scope marker SHALL precede the model identifier
- **AND** the filled marker SHALL use the same semantic accent foreground as Thinking Level's filled default radio marker
- **AND** its success-colored active-model checkmark, when present, SHALL appear immediately after its `[provider]` badge
- **AND** marker colors SHALL remain independent of whether the row is highlighted

#### Scenario: Toggle scope without saving
- **WHEN** the user presses Space on a model whose scope membership changes
- **THEN** the dialog SHALL remain open and update the session's cycling scope immediately
- **AND** the title SHALL become `Models (unsaved)`
- **AND** switching between `all` and `scoped` SHALL reflect the pending scope state

#### Scenario: Save scope changes
- **WHEN** the user presses Ctrl+S after changing scope membership or order and persistence succeeds
- **THEN** the scope SHALL be saved, the dialog SHALL remain open, and `(unsaved)` SHALL disappear from the title
- **AND** a save failure SHALL leave `(unsaved)` visible and report the failure without closing the dialog

#### Scenario: Select the active model
- **WHEN** the user presses Enter on an available model
- **THEN** the active model and persisted default SHALL change through the existing model-selection policy
- **AND** the dialog SHALL close and the existing model confirmation SHALL be presented
- **AND** pending unsaved scope changes SHALL remain session-only rather than being saved as a side effect

#### Scenario: Cancel with pending scope changes
- **WHEN** the user presses Escape while the title shows `(unsaved)`
- **THEN** the dialog SHALL close silently and restore the ordinary input surface
- **AND** the changed scope SHALL remain effective for the current session but SHALL not be written to settings

#### Scenario: Refresh model catalogs
- **WHEN** the Models dialog starts its real background catalog refresh
- **THEN** the title SHALL remain `Models` or `Models (unsaved)` according to dirty state
- **AND** neither `(refreshing)` nor the full progress sentence SHALL appear in the dialog
- **WHEN** catalog refresh then succeeds
- **THEN** the dialog SHALL preserve the user's query, selected row where still available, pending scope edits, and dirty state while updating the available rows
- **AND** the dialog SHALL not show `(refreshed)` or a success sentence

#### Scenario: Model catalog refresh fails or times out
- **WHEN** catalog refresh fails or times out while the Models dialog is open
- **THEN** the dialog SHALL preserve the user's query, selected row where still available, pending scope edits, and dirty state without broadening availability to unauthenticated providers
- **AND** it SHALL report the bounded warning details in the dialog body without showing `(refreshing)` or `(refreshed)`

#### Scenario: Invoke an explicit model-selection binding
- **WHEN** the user invokes an explicitly configured model-selection shortcut in bare A1
- **THEN** the same unified Models dialog SHALL open
- **AND** scope management and model selection SHALL have the same behavior as invocation through `/models`
