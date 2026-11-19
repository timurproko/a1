## ADDED Requirements

### Requirement: The reload box stays visible for a minimum window
When `/reload` runs in bare A1, the shell SHALL show the reload box in place of the editor and SHALL keep it visible for at least 400 ms measured from the moment it was first shown, regardless of how quickly the reload workflow completes. A reload that takes longer than the window SHALL remove the box as soon as the workflow finishes. A reload that finishes sooner SHALL wait only for the remainder of the window before restoring the editor and presenting the completion notice; the reload workflow itself SHALL NOT be delayed by the hold. The window, the clock, and the wait SHALL be injectable through the session shell options so tests are deterministic, and production SHALL use the defaults. Disposing the shell during the hold SHALL release the hold without restoring the editor. The share surface and the `a1 pi` route SHALL be unchanged.

#### Scenario: Reload finishes instantly
- **WHEN** `/reload` completes 50 ms after the reload box was shown
- **THEN** the box SHALL remain visible for a further 350 ms
- **AND** the editor SHALL return and the completion notice SHALL appear only after that remainder elapses

#### Scenario: Reload already used the window
- **WHEN** `/reload` completes 400 ms or more after the reload box was shown
- **THEN** the box SHALL be removed immediately with no additional wait

#### Scenario: Dispose during the hold
- **WHEN** the shell is disposed while the reload box is being held
- **THEN** the hold SHALL end without waiting and the editor SHALL NOT be restored
