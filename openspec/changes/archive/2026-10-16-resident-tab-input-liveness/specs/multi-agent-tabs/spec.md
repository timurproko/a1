## ADDED Requirements

### Requirement: Tab input rules and prompts follow the viewed tab
The attach client SHALL apply a failed tab's restricted input rules only while that tab is viewed, and SHALL forward input normally to any other viewed tab. A tab prompt that captures keys, such as the busy-close confirmation, the overflow chooser, rename, or the tab context menu, SHALL be cancelled when the viewed tab changes or its tab is removed. While such a prompt is open, its notice SHALL stay visible over tab output. A failed or refused new-tab request SHALL show its reason.

#### Scenario: Switch away from a failed tab
- **WHEN** the viewed tab fails and the user switches to another tab that produces no new output
- **THEN** keys typed in the other tab SHALL reach it

#### Scenario: Close prompt under streaming output
- **WHEN** the busy-close confirmation is open and the tab keeps streaming output
- **THEN** the confirmation notice SHALL remain visible until the user answers or cancels it

#### Scenario: Close prompt after a tab switch
- **WHEN** the busy-close confirmation is open and the user clicks another tab in the strip
- **THEN** the confirmation SHALL be cancelled and keys SHALL reach the newly viewed tab

#### Scenario: New tab refused
- **WHEN** a new-tab request is refused for the tab limit or fails with `tab-start-busy`
- **THEN** the terminal SHALL show a notice naming the reason
