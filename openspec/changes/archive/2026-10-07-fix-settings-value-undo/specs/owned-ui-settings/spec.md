## ADDED Requirements

### Requirement: Pending setting values remain visually stable

The owned Settings screen SHALL continue to show a requested scalar value immediately while its save is unresolved, but SHALL render that optimistic value without comparing it to the stale effective value from the preceding source snapshot. It SHALL NOT append transient effective-value or application-boundary text that disappears when the same successful live value is reflected by the source. After completion, the refreshed source state SHALL remain authoritative: a deferred setting SHALL show its real stored/effective distinction, and a failed setting SHALL restore the prior authoritative value and report the failure.

#### Scenario: Save a live scalar value

- **WHEN** the user changes a live scalar setting and its backend save has not settled
- **THEN** the value cell SHALL show only the requested value using its normal value formatting
- **AND** it SHALL NOT flash an effective-value or application-boundary suffix derived from the prior snapshot
- **WHEN** the save succeeds and the source reflects that live value
- **THEN** the same value SHALL remain visually stable without an intermediate replacement string

#### Scenario: Save a deferred scalar value

- **WHEN** the user changes a deferred scalar setting and its backend save has not settled
- **THEN** the value cell SHALL show the requested value without stale effective-state decoration
- **WHEN** the save completes with a different current effective value
- **THEN** the refreshed row MAY show the authoritative stored value, effective value, and application boundary

#### Scenario: Pending scalar save fails

- **WHEN** the optimistic scalar save fails or is unavailable
- **THEN** the row SHALL restore the authoritative source value
- **AND** the Settings screen SHALL report the failure rather than leaving the optimistic value displayed as saved

### Requirement: Settings edits can be undone within the open screen

The owned Settings screen SHALL retain transient reverse-order undo history for successful scalar and structured-setting edits made during that screen instance. `Ctrl+Z` SHALL restore the exact value that preceded the newest successful edit through the same backend and application boundary as an ordinary change. Each successful invocation SHALL remove one undo step, so repeated invocations restore earlier edits in reverse user-action order. An undo restoration SHALL NOT create a redo or another undo step, and closing the Settings screen SHALL discard its history.

Failed forward changes SHALL NOT become undoable. If restoration fails or is unavailable, the current authoritative value SHALL remain in effect, the failure SHALL be reported, and that undo step SHALL remain available for retry. For a structured setting, one step SHALL restore the preceding whole object and an open structured dialog SHALL show that restored object.

#### Scenario: Undo one scalar edit

- **WHEN** a scalar setting change succeeds and the user presses `Ctrl+Z`
- **THEN** the setting SHALL be changed through its owning backend to the scalar value that preceded that edit
- **AND** the restored value SHALL be shown without creating a redo step

#### Scenario: Undo multiple edits

- **WHEN** multiple setting changes succeed during one Settings screen instance
- **AND** the user presses `Ctrl+Z` repeatedly
- **THEN** each press SHALL restore one prior value in reverse user-action order
- **AND** asynchronous completion order SHALL NOT reorder those undo steps

#### Scenario: Undo a structured edit

- **WHEN** a structured-setting part change succeeds and the user presses `Ctrl+Z`
- **THEN** the preceding whole structured value SHALL be written through the owning backend
- **AND** an open structured dialog SHALL show the restored part values

#### Scenario: Forward change fails

- **WHEN** a setting change fails before it is successfully stored or applied
- **THEN** that attempted change SHALL NOT add an undo step
- **AND** `Ctrl+Z` SHALL NOT treat the failed optimistic value as saved history

#### Scenario: Undo restoration fails

- **WHEN** restoring the newest undo step fails or becomes unavailable
- **THEN** the Settings screen SHALL retain the current authoritative value and report the failure
- **AND** a later `Ctrl+Z` SHALL be able to retry that same undo step

#### Scenario: Close and reopen Settings

- **WHEN** the user closes a Settings screen that has undo history and later opens a new Settings screen
- **THEN** the new screen SHALL have no undo history from the prior screen

### Requirement: A structured-setting dialog has one upper boundary rule

When the owned Settings screen opens a structured-setting dialog, the dialog's own standard top rule SHALL replace the ordinary divider between Settings content and footer guidance. The frame SHALL show exactly one full-width boundary rule above the dialog title rather than stacking the Settings divider with the dialog rule. A generic structured dialog SHALL then show its setting title, the selected part's muted description, its menu rows, concise shortcut/action hints, and its standard bottom rule.

#### Scenario: Open a structured setting

- **WHEN** the user opens a setting whose value is edited through the structured dialog
- **THEN** exactly one full-width rule SHALL separate the Settings list from the dialog title
- **AND** no second Settings footer-divider rule SHALL be rendered above that dialog rule

#### Scenario: Use the structured dialog after removing the redundant divider

- **WHEN** the user navigates in the open structured dialog
- **THEN** its title SHALL remain one row below the sole top rule
- **AND** the selected part's muted description SHALL appear below the title and above the menu rows
- **AND** the dialog's shortcut guidance and bottom rule SHALL remain visible

### Requirement: The per-model thinking setting uses the pinned stepped selector

The owned Settings screen SHALL present the Agent `modelThinkingLevels` structured setting through a keyboard-only two-step selector matching A1's modal hierarchy rather than through the generic object-part panel. Both steps SHALL use the title `Thinking Level` followed on the same line by a muted `(step N/2)` marker. Step 1 SHALL show the muted next-line description `Select a model to configure`, a focused searchable input, and the models supplied by the setting descriptor. A bracketed provider suffix such as `[openai-codex]` SHALL use the muted role on selected and unselected model rows, matching the Models dialog. Typing SHALL filter model labels, Up/Down SHALL move the selected model, Enter SHALL advance to that model's supported level choices, and Escape SHALL close from step 1.

Step 2 SHALL retain the `Thinking Level` title with `(step 2/2)`, show the muted next-line description `Select default thinking level for {model label}`, offer only the supported levels declared for that model, and add pinned Pi's clear-override choice when that model has an override. The model label SHALL NOT replace or extend the title. Enter on clear override SHALL remove that model's override; Enter on a level SHALL write the whole updated object through the Agent backend and return to step 1 so another model can be configured. Escape SHALL return to step 1 without writing. The footer SHALL describe only the active step's keyboard behavior, including `Type search`, `Enter select`, and `Esc back` on step 1, rather than showing the main Settings adjustment or undo hints.

#### Scenario: Open per-model thinking levels

- **WHEN** the user opens the `modelThinkingLevels` setting
- **THEN** the dialog SHALL show `Thinking Level` with a muted `(step 1/2)`, the muted next-line description `Select a model to configure`, a focused search input, and descriptor-supplied model rows
- **AND** bracketed provider suffixes SHALL be muted as they are in the Models dialog
- **AND** its footer SHALL show `Type search`, `Enter select`, and `Esc back` rather than generic Settings guidance

#### Scenario: Filter and choose a model

- **WHEN** the user types a query in step 1
- **THEN** only matching descriptor-supplied model labels SHALL remain
- **WHEN** the user navigates and presses Enter on a model
- **THEN** step 2 SHALL keep the `Thinking Level` title with muted `(step 2/2)`
- **AND** the next line SHALL say `Select default thinking level for {model label}` in the muted role
- **AND** the model label SHALL NOT appear in the title
- **AND** the menu SHALL show its declared supported levels plus clear override when an override exists

#### Scenario: Save a model level

- **WHEN** the user selects a supported level in step 2
- **THEN** the whole override object SHALL be written through the Agent backend with that model set to the selected level
- **AND** the dialog SHALL return to step 1 for another selection

#### Scenario: Restore the model default

- **WHEN** the user selects clear override in step 2
- **THEN** that model key SHALL be absent from the whole object written through the Agent backend
- **AND** other model overrides SHALL remain unchanged

#### Scenario: Go back without changing

- **WHEN** the user presses Escape in step 2
- **THEN** the dialog SHALL return to step 1 without writing
- **WHEN** the user presses Escape in step 1
- **THEN** the structured dialog SHALL close and restore the Settings list

### Requirement: Structured-setting dialogs are keyboard-only

While any structured-setting dialog is open, pointer motion, presses, releases, and wheel reports SHALL be consumed without moving its selection, changing a part, advancing a step, writing a value, or acting on the Settings list behind it. All dialog navigation and changes SHALL occur through the dialog's advertised keyboard shortcuts.

#### Scenario: Point or click in a structured dialog

- **WHEN** the user moves or presses the pointer over an open structured-setting dialog
- **THEN** the report SHALL be consumed without changing dialog selection or settings state

#### Scenario: Point outside a structured dialog

- **WHEN** a pointer report lands outside the visible structured rows while the dialog is open
- **THEN** it SHALL NOT act on the Settings list, scrollbar, or values behind the dialog

## MODIFIED Requirements

### Requirement: The Agent section exposes Pi's copy preference without redundant viewport scrolling

When bare A1 provides application-owned fullscreen frame selection, the owned settings screen SHALL expose pinned Pi's `fullscreenCopyOnSelect` setting exactly once in the existing Agent section. The entry SHALL use the concise bare-A1 label `Copy on select` and Pi's generated description, SHALL show the value persisted by Pi's settings manager, and SHALL remain an Agent-backend boolean rather than an A1-owned setting. It SHALL be writable through the engine settings port and SHALL declare live application.

Bare A1 SHALL NOT expose or bind Pi's `fullscreenWheelScrollLines` setting because the custom viewport's global A1-owned `scrollbarSpeed` setting is its sole wheel-distance and acceleration authority. The pinned comparison profile SHALL retain Pi's original `Fullscreen copy on select` and `Fullscreen wheel scrolling` wording, settings, persistence, and effects.

#### Scenario: Inspect the Agent section

- **WHEN** bare A1 opens the owned settings screen with its selection owner and custom viewport attached
- **THEN** the Agent section SHALL contain one `Copy on select` boolean entry backed by Pi's `fullscreenCopyOnSelect` key
- **AND** its displayed value SHALL match the persisted Pi setting
- **AND** no `Fullscreen wheel scrolling` entry SHALL appear

#### Scenario: Change automatic copy

- **WHEN** the reader changes `Copy on select`
- **THEN** the change SHALL be written through the engine settings port and applied live to the active bare-A1 selection owner
- **AND** no A1 settings document SHALL receive a duplicate value

#### Scenario: Use global owned scrolling

- **WHEN** bare A1's custom viewport handles wheel input
- **THEN** its distance and acceleration SHALL come from the global A1-owned Scroll settings
- **AND** Pi's `fullscreenWheelScrollLines` value SHALL NOT be bound as a competing bare-A1 shell effect

#### Scenario: Keep comparison settings behavior unchanged

- **WHEN** the reader uses the `a1 pi` comparison profile
- **THEN** its pinned settings presentation SHALL retain `Fullscreen copy on select` and `Fullscreen wheel scrolling`
- **AND** their fullscreen behavior SHALL remain owned by pinned Pi without a bare-A1 label override or duplicate setting
