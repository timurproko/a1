# Spec Delta

## ADDED Requirements

### Requirement: Enter opens an enumerated setting menu before changing its value

When an editable enumerated scalar row has focus in the owned Settings screen, Enter SHALL open its existing value menu without changing the setting. A keyboard-opened menu SHALL make the first declared choice active immediately while marking the effective value independently. While the menu is open, Up and Down SHALL navigate its choices, Escape SHALL close it without a write, and Enter SHALL apply the active choice and close the menu. Closed-menu Left and Right adjustment, numeric steppers, structured-setting dialogs, menu placement, and pointer interaction SHALL retain their existing behavior.

#### Scenario: Open a scalar menu with Enter

- **WHEN** an editable enumerated scalar Settings row has focus and the user presses Enter
- **THEN** its value menu SHALL open with the first declared choice active
- **AND** the effective choice SHALL remain marked independently
- **AND** no setting value SHALL be written

#### Scenario: Navigate and confirm a keyboard-opened menu

- **WHEN** a scalar value menu was opened with Enter
- **THEN** Up and Down SHALL move the active choice within the menu's existing bounds
- **AND** pressing Enter SHALL apply the active choice through the setting's owning backend and close the menu

#### Scenario: Cancel a keyboard-opened menu

- **WHEN** a scalar value menu was opened with Enter and the user presses Escape
- **THEN** the menu SHALL close without changing or writing the setting

#### Scenario: Retain specialized setting controls

- **WHEN** the focused setting is numeric or structured rather than an enumerated scalar
- **THEN** Enter SHALL retain that setting's existing stepper or structured-dialog behavior
- **AND** Left and Right on a closed enumerated row SHALL retain direct value adjustment
