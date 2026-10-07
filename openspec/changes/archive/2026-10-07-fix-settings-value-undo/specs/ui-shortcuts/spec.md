## ADDED Requirements

### Requirement: Settings undo dispatch and guidance share one declaration

The owned Settings surface SHALL declare `Ctrl+Z` as its undo action in every ordinary Settings scope that can change or continue presenting a setting value. The list, scalar value menu, active search state, and generic structured-part dialog SHALL dispatch the chord to the same screen-local Settings undo behavior. The active Settings shortcut declarations SHALL supply the concise `Ctrl+Z undo` footer guidance and shortcut listing entry; no separate hardcoded hint SHALL advertise the action. Every visible owned Settings hint SHALL use a concise `<shortcut> <action>` label without the connective word `to`, including `/ search`, `↑↓ navigate`, `Enter/Space change`, `Ctrl+Z undo`, and `Esc close`. This grammar and the shared dim-key/muted-action roles SHALL be enforced centrally at owned shortcut declaration and rendering boundaries so new owned dialogs inherit the rule without per-dialog consistency assertions. Pinned Pi surfaces MAY retain upstream wording through their separate adapter. A specialized stepped selector that replaces ordinary setting editing, including per-model thinking configuration, SHALL instead advertise and dispatch only its step-specific keyboard actions while it is open. The chord SHALL remain local to Settings and SHALL NOT change editor undo or pinned comparison-profile bindings.

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

#### Scenario: Undo from a generic structured-setting dialog

- **WHEN** a generic structured-part dialog is open and the user presses `Ctrl+Z`
- **THEN** the dialog's declared Settings undo action SHALL run

#### Scenario: Show Settings undo guidance

- **WHEN** the Settings footer or generic structured-part footer presents its active shortcut hints
- **THEN** it SHALL include `Ctrl+Z undo`
- **AND** all visible hints SHALL use concise shortcut/action labels without the connective word `to`
- **AND** the same declaration SHALL identify `Ctrl+Z` as Settings undo in shortcut listings

#### Scenario: Reject an inconsistent owned-dialog hint centrally

- **WHEN** any owned dialog declares or renders a keyed shortcut action beginning with connective `to`
- **THEN** the shared shortcut-hint boundary SHALL reject that entry
- **AND** no dialog-specific wording test SHALL be required to enforce the common grammar

#### Scenario: Show stepped-selector guidance

- **WHEN** the per-model thinking selector is open
- **THEN** its footer SHALL use concise shortcut/action pairs for the active step, including `Type search`, `Enter select`, and `Esc back`
- **AND** it SHALL NOT show the main Settings adjustment or undo hints as though those actions were active

#### Scenario: Keep undo scopes isolated

- **WHEN** `Ctrl+Z` is used outside the owned Settings surface
- **THEN** this Settings declaration SHALL NOT handle it or alter the effective undo binding of another surface
