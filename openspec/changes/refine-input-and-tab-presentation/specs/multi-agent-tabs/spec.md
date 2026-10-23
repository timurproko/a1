## ADDED Requirements

### Requirement: Resident attach starts without cursor or selection artifacts
The resident attach client SHALL hide the outer terminal cursor as part of entering its fullscreen terminal modes, before any asynchronous strip or child presentation can occur. When the server already has one or more resident Agent tabs and the launch does not request a specific tab, the attach handshake SHALL identify the first Agent in durable strip order and the client SHALL present that tab as active in its first tab-bearing frame. A profile with no existing tab SHALL retain the established first-draw gate for the newly created tab.

#### Scenario: First launch waits for child presentation
- **WHEN** bare A1 enters resident fullscreen mode before its first child surface is ready
- **THEN** no visible cursor SHALL appear in the blank child area
- **AND** the cursor SHALL remain hidden until a committed child surface places it

#### Scenario: Reattach to existing Agents
- **WHEN** one or more Agent tabs are already running and the user runs bare A1 without selecting a tab
- **THEN** the first Agent in strip order SHALL be the active tab in the first frame that shows those tabs
- **AND** the strip SHALL NOT briefly show every tab as inactive

#### Scenario: Explicit tab target remains authoritative
- **WHEN** launch requests a specific existing resident tab
- **THEN** that requested tab SHALL remain the initial active tab rather than being replaced by the first Agent

### Requirement: The resident tab bar follows the configured edge
Bare A1 SHALL expose one resident tab-bar position with allowed values `top` and `bottom`, defaulting to `top`. This requirement supersedes earlier top-only strip-placement statements. The chosen value SHALL apply live to attached resident clients. The tab bar SHALL occupy exactly one outer row at the selected edge, while every child retains the same column count and one fewer row than the outer terminal. Strip controls, clock, menus, notices, drag markers, terminal cursor, selection, and child mouse coordinates SHALL be composed relative to the selected edge. `a1 solo` and `a1 pi` SHALL remain strip-free.

#### Scenario: Default top position
- **WHEN** the profile has no stored tab-bar position
- **THEN** the strip SHALL occupy the top row and the child surface SHALL occupy the rows below it

#### Scenario: Bottom position
- **WHEN** the effective tab-bar position is `bottom`
- **THEN** the child surface SHALL begin on the first outer row and the strip SHALL occupy the final outer row
- **AND** the child SHALL retain the same row count it has with a top strip

#### Scenario: Change position live
- **WHEN** the user changes the tab-bar position while a resident client is attached
- **THEN** the next coherent presentation SHALL move the strip and current child surface to their configured rows without restarting an Agent or changing the active tab
- **AND** no stale strip, child row, overlay, or cursor SHALL remain at the former position

#### Scenario: Point at the bottom strip
- **WHEN** the strip is at the bottom and a pointer report addresses its row
- **THEN** the attach client SHALL own that report and the child SHALL receive no mouse event

#### Scenario: Point at a child row with a bottom strip
- **WHEN** the strip is at the bottom and a pointer report addresses the child surface
- **THEN** the child SHALL receive the same zero-based row that the equivalent visible row has in `a1 solo`
- **AND** no top-strip subtraction SHALL be applied

#### Scenario: Present overlays and cursor at either edge
- **WHEN** host overlays or the child cursor are visible and the tab-bar position changes
- **THEN** each SHALL remain aligned to the same semantic child cells and host controls at the newly configured edge
