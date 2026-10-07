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
