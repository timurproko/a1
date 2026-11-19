# Spec Delta

## ADDED Requirements

### Requirement: Enter opens an enumerated setting menu before changing its value

When an editable enumerated scalar row has focus in the owned Settings screen, Enter SHALL open its existing value menu without changing the setting. A keyboard-opened menu SHALL make the current effective choice active immediately, with its effective-value mark retained, and SHALL render the source row's value in the terminal foreground used when the pointer rests over that value. While the menu is open, Up and Down SHALL navigate from that choice, Escape SHALL close it without a write, and Enter SHALL apply the active choice and close the menu. Closing a keyboard-opened menu SHALL restore the source value's ordinary selected-row role. Closed-menu Left and Right adjustment, numeric steppers, structured-setting dialogs, menu placement, and pointer interaction SHALL retain their existing behavior.

#### Scenario: Open a scalar menu with Enter

- **WHEN** an editable enumerated scalar Settings row has focus and the user presses Enter
- **THEN** its value menu SHALL open with the current effective choice active
- **AND** that choice SHALL retain the effective-value mark
- **AND** the source row's value SHALL use the same bright foreground as a pointer-opened value
- **AND** no setting value SHALL be written

#### Scenario: Navigate and confirm a keyboard-opened menu

- **WHEN** a scalar value menu was opened with Enter
- **THEN** Up and Down SHALL move the active choice within the menu's existing bounds
- **AND** pressing Enter SHALL apply the active choice through the setting's owning backend and close the menu

#### Scenario: Cancel a keyboard-opened menu

- **WHEN** a scalar value menu was opened with Enter and the user presses Escape
- **THEN** the menu SHALL close without changing or writing the setting
- **AND** the source row's value SHALL return to its ordinary selected-row presentation

#### Scenario: Retain specialized setting controls

- **WHEN** the focused setting is numeric or structured rather than an enumerated scalar
- **THEN** Enter SHALL retain that setting's existing stepper or structured-dialog behavior
- **AND** Left and Right on a closed enumerated row SHALL retain direct value adjustment
