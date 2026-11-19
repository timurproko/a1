# Spec Delta

## ADDED Requirements

### Requirement: Successful setting changes preserve standing guidance

The owned Settings screen SHALL keep its standing shortcut guidance visible after a successful scalar or structured change, including deferred changes and successful undo restorations. Only actionable conditions such as a save or restoration failure or an interrupt warning SHALL replace that guidance.

#### Scenario: Successfully change a setting

- **WHEN** a setting change succeeds at any application boundary
- **THEN** the standing shortcut guidance SHALL remain visible
- **AND** no successful-save notice SHALL replace it

#### Scenario: Successfully restore a setting

- **WHEN** an undo restoration succeeds
- **THEN** the standing shortcut guidance SHALL remain visible
- **AND** no successful-restoration notice SHALL replace it

#### Scenario: Setting operation fails

- **WHEN** a setting change or undo restoration fails
- **THEN** the Settings screen SHALL replace the standing shortcut guidance with the failure notice

## MODIFIED Requirements

### Requirement: A changed setting applies to the running session
A1 SHALL apply a changed setting at the application boundary declared by its resolved entry and SHALL keep effective values consistent across every surface that reads them. Each presented setting SHALL declare one of `live`, `next-session`, `next-start`, or `current-exit`. A live setting SHALL take effect before the change reports success. A deferred setting SHALL store the selected value while the running owner retains its previous value until the declared boundary. A setting unavailable in the active product mode or environment SHALL be omitted from the settings UI without an unavailable placeholder row. These rules SHALL apply equally to A1 settings and settings supplied through the engine settings port.

#### Scenario: Change a live-applicable setting
- **WHEN** the user accepts a change to a setting declared as `live`
- **THEN** the new value SHALL take effect in the running session before success is reported
- **AND** every surface reading that setting SHALL observe the same effective value

#### Scenario: Change a restart-required setting
- **WHEN** the user accepts a change declared as `next-session`, `next-start`, or `current-exit`
- **THEN** the value SHALL be stored and the running owner SHALL retain the previous value until that boundary
- **AND** the Settings row SHALL show the selected stored value without inline effective-value or application-boundary text

#### Scenario: Setting is unavailable
- **WHEN** the active product mode or environment cannot provide a setting's effect
- **THEN** the settings UI SHALL omit the entry and any option-specific unavailability text
- **AND** no hidden route SHALL accept a persisted no-op

#### Scenario: Applying a change fails
- **WHEN** storage accepts a value but its declared live effect fails
- **THEN** the screen SHALL report the failure, SHALL not claim the value is effective, and SHALL restore one consistent effective value

#### Scenario: Abandon a change
- **WHEN** the user cancels out of editing a setting before accepting it
- **THEN** no value SHALL be stored and the running session SHALL be unaffected

### Requirement: Pending setting values remain visually stable

The owned Settings screen SHALL show a requested scalar value immediately while its save is unresolved and SHALL continue to render the selected stored value after success. A scalar row SHALL NOT append effective-value or application-boundary text, whether the change is pending, live, or deferred. A failed setting SHALL restore the prior authoritative value and report the failure.

#### Scenario: Save a live scalar value

- **WHEN** the user changes a live scalar setting and its backend save has not settled
- **THEN** the value cell SHALL show only the requested value using its normal value formatting
- **AND** it SHALL NOT flash an effective-value or application-boundary suffix derived from the prior snapshot
- **WHEN** the save succeeds and the source reflects that live value
- **THEN** the same value SHALL remain visually stable without an intermediate replacement string

#### Scenario: Save a deferred scalar value

- **WHEN** the user changes a deferred scalar setting
- **THEN** the value cell SHALL show the selected stored value while the save is pending and after it succeeds
- **AND** it SHALL NOT append the current effective value or application boundary

#### Scenario: Reopen Settings with a deferred value

- **WHEN** Settings opens while a deferred stored value differs from the value currently in effect
- **THEN** the value cell SHALL show only the selected stored value

#### Scenario: Pending scalar save fails

- **WHEN** the optimistic scalar save fails or is unavailable
- **THEN** the row SHALL restore the authoritative source value
- **AND** the Settings screen SHALL report the failure rather than leaving the optimistic value displayed as saved

### Requirement: Structured-setting dialogs are keyboard-only

While any structured-setting dialog is open, pointer motion, presses, and releases SHALL be consumed without moving its selection, changing a part, advancing a step, writing a value, or acting on Settings rows. Wheel input over the Settings content SHALL continue to scroll the list behind the fixed dialog. All dialog navigation and changes SHALL occur through the dialog's advertised keyboard shortcuts.

#### Scenario: Point or click in a structured dialog

- **WHEN** the user moves or presses the pointer over an open structured-setting dialog
- **THEN** the report SHALL be consumed without changing dialog selection or settings state

#### Scenario: Point outside a structured dialog

- **WHEN** a non-wheel pointer report lands outside the visible structured rows while the dialog is open
- **THEN** it SHALL NOT act on the Settings list, scrollbar, or values behind the dialog

#### Scenario: Scroll Settings content with a structured dialog open

- **WHEN** the user sends mouse-wheel input over the Settings content while a structured-setting dialog is open
- **THEN** the Settings list SHALL scroll by the configured wheel distance
- **AND** the structured dialog SHALL remain open and unchanged
