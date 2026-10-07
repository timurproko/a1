## ADDED Requirements

### Requirement: Settings undo dispatch and guidance share one declaration

The owned Settings surface SHALL declare `Ctrl+Z` as its undo action in every Settings scope that can change or continue presenting a setting value. The list, scalar value menu, active search state, and structured-setting dialog SHALL dispatch the chord to the same screen-local Settings undo behavior. The active Settings shortcut declarations SHALL supply the `Ctrl+Z to undo` footer guidance and shortcut listing entry; no separate hardcoded hint SHALL advertise the action. The chord SHALL remain local to Settings and SHALL NOT change editor undo or pinned comparison-profile bindings.

#### Scenario: Undo from the settings list

- **WHEN** the Settings list has focus and the user presses `Ctrl+Z`
- **THEN** the declared Settings undo action SHALL run

#### Scenario: Undo while a value menu is open

- **WHEN** a scalar value menu is open and the user presses `Ctrl+Z`
- **THEN** the menu SHALL close and the declared Settings undo action SHALL run
- **AND** the menu SHALL NOT consume the chord as an unrelated navigation key

#### Scenario: Undo while search is active

- **WHEN** Settings search is active and the user presses `Ctrl+Z`
- **THEN** the declared Settings undo action SHALL run while preserving the active query

#### Scenario: Undo from a structured-setting dialog

- **WHEN** a structured-setting dialog is open and the user presses `Ctrl+Z`
- **THEN** the dialog's declared Settings undo action SHALL run

#### Scenario: Show Settings undo guidance

- **WHEN** the Settings footer or structured-dialog footer presents its active shortcut hints
- **THEN** it SHALL include `Ctrl+Z to undo`
- **AND** the same declaration SHALL identify `Ctrl+Z` as Settings undo in shortcut listings

#### Scenario: Keep undo scopes isolated

- **WHEN** `Ctrl+Z` is used outside the owned Settings surface
- **THEN** this Settings declaration SHALL NOT handle it or alter the effective undo binding of another surface
