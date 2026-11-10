## ADDED Requirements

### Requirement: Apps provides searchable switching among owned applications

Bare A1 SHALL provide a centered searchable dialog titled `Apps` containing Agent, Settings, and Changelog. The dialog SHALL use the shared compact floating selector presentation with a title, search input, active-row highlight, and declared navigation, open, and close guidance. Search SHALL filter application names case-insensitively. Up and Down SHALL navigate matching choices; Enter SHALL open the selected match; an empty result SHALL open nothing. Esc SHALL close the launcher without changing applications.

The launcher SHALL be reachable from Agent, Settings, and Changelog through its effective declared shortcut. Selecting Agent SHALL restore the existing Agent session rather than create a session or process. Selecting Settings or Changelog SHALL open the existing full-screen application through its neutral route. Selecting the already active application SHALL NOT duplicate or reset it. Switching SHALL preserve the Agent prompt, attachments, queue, and active engine work; canceling SHALL restore the originating application and focus. At most one destination application SHALL receive input after a switch.

#### Scenario: Find and open an application

- **WHEN** the reader opens Apps and types `set`
- **THEN** Settings SHALL be a matching choice
- **AND** Enter SHALL open the existing full-screen Settings application and close Apps

#### Scenario: Search finds nothing

- **WHEN** the Apps query matches no application and Enter is pressed
- **THEN** no application SHALL open and the launcher SHALL remain available for editing or cancellation

#### Scenario: Return to the existing Agent

- **WHEN** the reader selects Agent from Apps while Settings or Changelog is presented
- **THEN** the same Agent session and draft SHALL be restored without starting another agent or session

#### Scenario: Switch from either full-screen application

- **WHEN** the reader invokes the effective Apps shortcut in Settings or Changelog
- **THEN** Apps SHALL open over that application
- **AND** selecting the other full-screen application SHALL replace the previous application without a stale close callback dismissing the destination

#### Scenario: Cancel or select the current application

- **WHEN** the reader cancels Apps or selects the application that was already active
- **THEN** that application's state and ordinary input focus SHALL remain intact

### Requirement: Application destinations are separate from Agent built-in commands

Bare A1 SHALL omit Settings and Changelog from its Agent built-in command surface, autocomplete, and command help. Their owned application routes SHALL remain available to Apps, and automatic startup What's New SHALL retain its existing document and acknowledgement behavior. The comparison profile SHALL retain its existing command catalog and routing. Application separation SHALL NOT remove unrelated extension or resource commands merely because their labels contain application names.

#### Scenario: Inspect Agent commands

- **WHEN** bare A1 presents built-in Agent command completion or command help
- **THEN** Settings and Changelog SHALL NOT be offered as built-in Agent commands
- **AND** both applications SHALL remain reachable through Apps

#### Scenario: Present startup release information

- **WHEN** the startup policy has an unseen What's New document
- **THEN** the existing Changelog application route SHALL still present and acknowledge it

#### Scenario: Keep comparison commands

- **WHEN** the comparison profile presents or dispatches Settings and Changelog commands
- **THEN** its existing command behavior SHALL remain unchanged
