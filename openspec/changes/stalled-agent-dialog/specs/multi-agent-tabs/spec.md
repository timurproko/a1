## ADDED Requirements

### Requirement: A stalled Agent is answered through a centered dialog
When the viewed tab's status is `stalled` or `unresponsive` and no popup, rename, or drag is active, the attach client SHALL open one centered modal dialog over that tab with the title `Agent stalled`, one line describing the state, the options `Restart` and `Close` in that order without shortcut labels, and the standard A1 dialog footer naming navigate, select, and close. The complete presented surface, strip and tab body, SHALL be dimmed while the dialog is open and restored when it closes. `Up` and `Down` SHALL move the selection, `Enter` or a click on an option SHALL run it, and `Esc` SHALL dismiss the dialog without forwarding to the tab and SHALL NOT reopen it for the same stall. `Restart` SHALL request the tab's restart exactly as the former `R` key did; `Close` SHALL run the same close path as the context menu, including the busy-close confirmation. The dialog SHALL close when the tab's status leaves `stalled`/`unresponsive`, when the viewed tab changes, or when the tab is removed. The attach client SHALL NOT paint a stalled notice row under the strip, SHALL NOT treat a bare `R` on a stalled tab as restart, and the session shell SHALL NOT append a `No progress` line to the transcript. Assigned tab actions SHALL keep working while the dialog is open.

#### Scenario: A working tab stalls
- **WHEN** the viewed tab reports `stalled` after the stall notice interval
- **THEN** the dialog SHALL appear centered over the dimmed surface with `Restart` selected
- **AND** no notice row SHALL appear under the strip and no `No progress` line SHALL appear in the transcript

#### Scenario: Restart from the dialog
- **WHEN** the user presses `Enter` with `Restart` selected
- **THEN** the attach client SHALL send the tab restart request once and close the dialog

#### Scenario: Close from the dialog
- **WHEN** the user moves the selection to `Close` and presses `Enter`
- **THEN** the attach client SHALL run the same close path as the context menu's Close

#### Scenario: Dismiss and interrupt
- **WHEN** the user presses `Esc` while the dialog is open
- **THEN** the dialog SHALL close, the surface SHALL be restored, the tab SHALL NOT receive that `Esc`, and the dialog SHALL NOT reopen until the tab's status leaves and returns to stalled or the user views the tab again
- **AND** a following `Esc` SHALL reach the tab and interrupt its turn as before

#### Scenario: The Agent recovers
- **WHEN** the tab's status changes from `stalled` to `working` or `idle` while the dialog is open
- **THEN** the dialog SHALL close and the surface SHALL be restored without user input

#### Scenario: View a stalled tab
- **WHEN** the user switches to a tab whose status is already `stalled`
- **THEN** the dialog SHALL open over that tab
- **AND** switching to another tab SHALL close it
