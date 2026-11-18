## RENAMED Requirements

- FROM: `### Requirement: Structured-setting dialogs are keyboard-only`
- TO: `### Requirement: Structured-setting dialogs support mouse choices without moving keyboard focus`

## MODIFIED Requirements

### Requirement: The per-model thinking setting uses the pinned stepped selector

The owned Settings screen SHALL present the Agent `modelThinkingLevels` structured setting through a keyboard- and mouse-operable two-step selector matching A1's modal hierarchy rather than through the generic object-part panel. Both steps SHALL use the title `Thinking Level` followed on the same line by a muted `(step N/2)` marker. Step 1 SHALL show the muted next-line description `Select a model to configure`, a focused searchable input using the exact ASCII `> ` prompt marker with the `>` in the active semantic accent role, and the models supplied by the setting descriptor. A bracketed provider suffix such as `[openai-codex]` SHALL use the muted role on selected and unselected model rows, matching the Models dialog. A selected model or thinking-level row SHALL place exactly one space between its arrow cursor and visible label; unselected levels SHALL NOT reserve hidden checkmark spacing. Typing SHALL filter model labels, Up/Down SHALL move the selected model, Enter SHALL advance to that model's supported level choices, and Escape SHALL close from step 1. Clicking a model SHALL advance for the clicked model without using the keyboard-active row as a substitute.

Step 2 SHALL retain the `Thinking Level` title with `(step 2/2)`, show the muted next-line description `Select default thinking level for {model label}`, offer only the supported levels declared for that model, and add pinned Pi's clear-override choice when that model has an override. The model label SHALL NOT replace or extend the title. Enter on clear override SHALL remove that model's override; Enter on a level SHALL write the whole updated object through the Agent backend and return to step 1 so another model can be configured. Clicking a level or clear-override row SHALL invoke that same action for the clicked choice. Escape SHALL return to step 1 without writing. The footer SHALL describe only the active step's keyboard behavior, including `Type search`, `Enter select`, and `Esc close` on step 1 and `Esc back` on step 2, rather than showing the main Settings adjustment or undo hints. Hover in either step SHALL use the shared text-only foreground blend without moving keyboard selection. Outside primary press SHALL close the entire configure workflow from either step without an additional write or underlying Settings action.

#### Scenario: Open per-model thinking levels

- **WHEN** the user opens the `modelThinkingLevels` setting
- **THEN** the dialog SHALL show `Thinking Level` with a muted `(step 1/2)`, the muted next-line description `Select a model to configure`, a focused search input beginning with exact ASCII `> ` whose `>` uses the active accent role, and descriptor-supplied model rows
- **AND** bracketed provider suffixes SHALL be muted as they are in the Models dialog
- **AND** its footer SHALL show `Type search`, `Enter select`, and `Esc close` rather than generic Settings guidance

#### Scenario: Filter and choose a model

- **WHEN** the user types a query in step 1
- **THEN** only matching descriptor-supplied model labels SHALL remain
- **AND** the marker, query, caret, and clipping SHALL retain shared input geometry
- **WHEN** the user navigates and presses Enter on a model
- **THEN** step 2 SHALL keep the `Thinking Level` title with muted `(step 2/2)`
- **AND** the next line SHALL say `Select default thinking level for {model label}` in the muted role
- **AND** the model label SHALL NOT appear in the title
- **AND** the menu SHALL show its declared supported levels plus clear override when an override exists
- **AND** the selected row's arrow SHALL be followed by exactly one space before its visible label

#### Scenario: Save a model level

- **WHEN** the user selects a supported level in step 2
- **THEN** the whole override object SHALL be written through the Agent backend with that model set to the selected level
- **AND** the dialog SHALL return to step 1 for another selection

#### Scenario: Restore the model default

- **WHEN** the user selects clear override in step 2
- **THEN** that model key SHALL be absent from the whole object written through the Agent backend
- **AND** other model overrides SHALL remain unchanged

#### Scenario: Go back without changing

- **WHEN** the user presses Escape in step 2 while its footer shows `Esc back`
- **THEN** the dialog SHALL return to step 1 without writing
- **WHEN** the user presses Escape in step 1 while its footer shows `Esc close`
- **THEN** the structured dialog SHALL close and restore the Settings list

#### Scenario: Click a different model or level from keyboard selection

- **WHEN** item A is keyboard-active and the user hovers item B in either step
- **THEN** only B's actionable text SHALL receive the shared accent blend and Enter SHALL still act on A
- **WHEN** the user primary-clicks B
- **THEN** the existing advance or write action SHALL run for B rather than A

#### Scenario: Click outside the second step

- **WHEN** the user primary-presses outside the Thinking Level panel in step 2
- **THEN** the configure workflow SHALL close without a write rather than returning to step 1
- **AND** the dismissal gesture SHALL NOT act on the Settings screen behind it

### Requirement: Structured-setting dialogs support mouse choices without moving keyboard focus

While any structured-setting dialog is open, it SHALL own pointer input without passing presses, motion, or releases through to the Settings list. A visible actionable row SHALL be clickable through its existing semantic change or step action, including generic object parts, Warnings, Default Model, and both Thinking Level steps. Pointer hover SHALL remain independent from keyboard selection and use the shared 75% ordinary-foreground / 25% accent text-only blend without adding or moving a background highlight. Enter SHALL continue to target the keyboard-active row after hovering another row. Row hit targets SHALL match the current centered, clipped, and scrolled panel geometry.

A primary press outside the complete panel rectangle SHALL close the configure workflow without an additional write and consume the entire gesture. It SHALL NOT act on Settings rows, values, menus, or the scrollbar behind it. Pressing blank padding inside the panel SHALL NOT dismiss it or write a value. Wheel input over the Settings content SHALL continue to scroll the list behind the fixed dialog without changing or closing the dialog. Existing keyboard shortcuts, settings write authority, undo state, and asynchronous error handling SHALL remain intact.

#### Scenario: Hover without changing keyboard focus

- **WHEN** keyboard-active structured row A differs from hovered row B
- **THEN** B SHALL receive only the shared text-hover treatment
- **AND** A's active marker and background SHALL remain unchanged
- **AND** Enter SHALL still act on A without writing B's value

#### Scenario: Point or click in a structured dialog

- **WHEN** the user primary-clicks visible actionable structured row B
- **THEN** the same semantic action as explicit keyboard activation of B SHALL run once through the existing backend authority
- **AND** no Settings row behind the panel SHALL be activated

#### Scenario: Point outside a structured dialog

- **WHEN** the pointer moves outside the panel while the dialog is open
- **THEN** the former hover SHALL clear without moving keyboard focus or acting on the underlying screen
- **WHEN** the user primary-presses outside the panel
- **THEN** the configure workflow SHALL close without an additional write
- **AND** that gesture SHALL NOT act on the Settings list, scrollbar, or values behind the dialog

#### Scenario: Scroll Settings content with a structured dialog open

- **WHEN** the user sends mouse-wheel input over the Settings content while a structured-setting dialog is open
- **THEN** the Settings list SHALL scroll by the configured wheel distance
- **AND** the structured dialog SHALL remain open and unchanged

### Requirement: The default model has a dedicated Settings configurator

The owned Settings screen SHALL expose Pi's persisted default provider/model pair as one writable Agent entry labeled `Default model`. The entry SHALL display `configure` rather than treating the model catalog as a scalar value menu, and SHALL appear immediately above `Default thinking level per model` in the Agent section. It SHALL declare `next-session` application and SHALL use Pi's existing default-model settings fields as its sole persistence authority.

Activating `Default model` SHALL open a keyboard- and mouse-operable searchable selector using the authenticated models supplied by the Agent setting descriptor. The selector SHALL use the owned modal hierarchy, an accent title `Default Model`, a muted instruction `Select the model used for new sessions`, a focused search input with the exact ASCII `> ` prompt marker, and shortcut guidance for typing, Up/Down navigation, Enter selection, and Escape close. Each model row SHALL use the Models-dialog form `modelId [provider]` without a duplicate display-name column. Search SHALL still match model identifier, display name, provider, and full `provider/modelId` reference. The persisted default SHALL be the initial selection when it remains available and SHALL have one success-colored `✓` immediately after `[provider]`, independent of the active session model.

Enter SHALL accept the selected full model reference through the Agent settings backend, close the selector immediately, and continue persistence asynchronously without rendering a saving state. A primary click on a model row SHALL accept that clicked full model reference through the same action, independently of the keyboard-active row. Hover SHALL use the shared text-only accent blend without moving keyboard selection. A successful write SHALL leave the Settings list visible and update Pi's persisted default provider/model pair without changing the active session model, active model indicator, current thinking level, or model cycling scope. Escape or an outside primary press SHALL close without writing; an outside-dismissal gesture SHALL NOT act on the Settings list behind it. If the write fails or becomes unavailable, the selector SHALL reopen with its query and selection preserved, the previous default SHALL remain authoritative, and the Settings failure channel SHALL report the error.

The pinned `a1 pi` comparison profile SHALL retain its existing model selector and select-as-default interaction without receiving the owned Settings configurator.

#### Scenario: Inspect the Agent Settings section

- **WHEN** bare A1 opens the owned Settings screen with authenticated models available
- **THEN** the Agent section SHALL contain one `Default model` entry whose value reads `configure`
- **AND** it SHALL appear immediately above `Default thinking level per model`
- **AND** the entry SHALL be backed by Pi's persisted default provider/model pair and declare `next-session` application

#### Scenario: Open default-model configuration

- **WHEN** the user activates `Default model`
- **THEN** the dialog SHALL show `Default Model`, the muted instruction `Select the model used for new sessions`, a focused search input beginning with ASCII `> `, and descriptor-supplied `modelId [provider]` rows without a duplicate display-name column
- **AND** the persisted default SHALL be selected and marked by one success-colored `✓` immediately after `[provider]` when it is available
- **AND** the active session model SHALL NOT be used as the default marker when it differs

#### Scenario: Filter default models

- **WHEN** the user types a query in the default-model selector
- **THEN** only models matching identifier, display name, provider, or full reference SHALL remain
- **AND** Up/Down navigation and the selected row SHALL remain bounded to the filtered results

#### Scenario: Save a different default model

- **WHEN** the user presses Enter on a different available model
- **THEN** the selector SHALL close immediately without showing a saving state
- **AND** a successful asynchronous write SHALL persist Pi's default provider/model pair as that model while the Settings list remains visible
- **AND** the active session model, thinking level, and cycling scope SHALL remain unchanged

#### Scenario: Click a model without moving keyboard focus on hover

- **WHEN** A is keyboard-active and the user hovers B
- **THEN** only B's actionable text SHALL receive the shared foreground blend and Enter SHALL still select A
- **WHEN** the user primary-clicks B
- **THEN** the selector SHALL close immediately and asynchronously persist B through the existing default-model action
- **AND** the active session model and cycling scope SHALL remain unchanged

#### Scenario: Close without changing the default

- **WHEN** the user presses Escape or primary-presses outside the default-model selector
- **THEN** the selector SHALL close without writing
- **AND** the previous persisted default SHALL remain unchanged
- **AND** an outside-dismissal gesture SHALL NOT act on the underlying Settings screen

#### Scenario: Default-model persistence fails

- **WHEN** an accepted model write later fails or is unavailable
- **THEN** the selector SHALL reopen with the same query and selected model
- **AND** the previous persisted default SHALL remain authoritative
- **AND** the failure SHALL be reported through the Settings failure channel

#### Scenario: Keep comparison model selection unchanged

- **WHEN** the user runs the `a1 pi` comparison profile
- **THEN** its pinned model selector SHALL retain its existing current-model and select-as-default actions
- **AND** the owned `Default model` Settings configurator SHALL NOT replace or modify that selector
