## MODIFIED Requirements

### Requirement: The per-model thinking setting uses the pinned stepped selector

The owned Settings screen SHALL present the Agent `modelThinkingLevels` structured setting through a keyboard-only two-step selector matching A1's modal hierarchy rather than through the generic object-part panel. Both steps SHALL use the title `Thinking Level` followed on the same line by a muted `(step N/2)` marker. Step 1 SHALL show the muted next-line description `Select a model to configure`, a focused searchable input using the exact ASCII `> ` prompt marker with the `>` in the active semantic accent role, and the models supplied by the setting descriptor. A bracketed provider suffix such as `[openai-codex]` SHALL use the muted role on selected and unselected model rows, matching the Models dialog. A selected model or thinking-level row SHALL place exactly one space between its arrow cursor and visible label; unselected levels SHALL NOT reserve hidden checkmark spacing. Typing SHALL filter model labels, Up/Down SHALL move the selected model, Enter SHALL advance to that model's supported level choices, and Escape SHALL close from step 1.

Step 2 SHALL retain the `Thinking Level` title with `(step 2/2)`, show the muted next-line description `Select default thinking level for {model label}`, offer only the supported levels declared for that model, and add pinned Pi's clear-override choice when that model has an override. The model label SHALL NOT replace or extend the title. Enter on clear override SHALL remove that model's override; Enter on a level SHALL write the whole updated object through the Agent backend and return to step 1 so another model can be configured. Escape SHALL return to step 1 without writing. The footer SHALL describe only the active step's keyboard behavior, including `Type search`, `Enter select`, and `Esc close` on step 1 and `Esc back` on step 2, rather than showing the main Settings adjustment or undo hints.

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

### Requirement: Settings application search omits a prompt marker
The owned full-screen Settings search input SHALL render no chevron or ASCII greater-than prompt marker. Its top and bottom rules, content inset, placeholder, block caret, filtering, navigation, and cancellation behavior SHALL remain unchanged. Settings-owned standard dialog searches, including the per-model Thinking Level selector's step-one model search, SHALL instead use the shared exact ASCII `> ` standard-dialog marker with the `>` in the active semantic accent role. Non-search structured text entries SHALL retain their established presentation.

#### Scenario: Open full-screen Settings search
- **WHEN** the user opens the `search settings` input
- **THEN** its input row SHALL begin with the placeholder or caret at the shared content inset
- **AND** no chevron or greater-than marker SHALL precede it

#### Scenario: Filter per-model thinking settings
- **WHEN** the per-model Thinking Level selector shows its step-one search input
- **THEN** exact ASCII `> ` SHALL precede the empty caret or typed query
- **AND** the `>` SHALL use the active semantic accent role
- **AND** model filtering, navigation, selection, focus, and Escape behavior SHALL remain unchanged

#### Scenario: Render a non-search structured text entry
- **WHEN** Settings presents a structured text editor that is not a search field
- **THEN** this requirement SHALL NOT add a search marker to that entry
