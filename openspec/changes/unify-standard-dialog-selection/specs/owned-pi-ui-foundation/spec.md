## ADDED Requirements

### Requirement: Standard bare-A1 lists share one selection palette

The bare-A1 Models, Skills, Thinking Level, and editor autocomplete menus SHALL present their selected item with their existing ordinary menu arrow `→` in accent foreground, the primary label in normal `text`, muted descriptive text, and the blue `selectedBg` selection background. The selected background SHALL cover only the rendered item span from its arrow through its final visible content cell, SHALL NOT fill otherwise unused cells after the item, and SHALL remain clipped within the available width without causing wrapping. Selection SHALL NOT bold the whole row.

The selected-item treatment SHALL preserve domain-specific semantic markers and content. Models SHALL retain its scoped/unscoped marker, provider badge, and active-model checkmark. Skills SHALL retain its `skill:<name>` label and separately presented selected description. Thinking Level SHALL retain aligned level, current, default, and reasoning-description columns. Autocomplete SHALL retain aligned command descriptions and completion behavior. Resume Session and Session Tree SHALL retain their specialized arrows, hierarchy, metadata, and geometry.

Unselected rows, search and filter behavior, list ordering, counters, descriptions, navigation, selection actions, default and scope persistence, cancellation, and dialog lifecycle SHALL remain unchanged. The explicit `a1 pi` comparison profile SHALL retain pinned Pi presentation.

#### Scenario: Highlight a model

- **WHEN** a model row is selected in the Models dialog
- **THEN** its arrow SHALL use accent foreground and its model identifier SHALL use normal `text` on `selectedBg`
- **AND** its provider badge SHALL remain muted and its scope and active-state markers SHALL retain their semantic roles
- **AND** the background SHALL end with the row's final marker or provider content without changing the row order or model action

#### Scenario: Highlight a skill

- **WHEN** a skill row is selected in the Skills dialog
- **THEN** its arrow SHALL use accent foreground and its `skill:<name>` label SHALL use normal `text` on `selectedBg`
- **AND** the background SHALL end with the final character of the `skill:<name>` label
- **AND** the selected skill description SHALL remain separately muted below the list

#### Scenario: Highlight a thinking level

- **WHEN** a thinking-level row is selected
- **THEN** its arrow SHALL use accent foreground and its level SHALL use normal `text` on `selectedBg`
- **AND** its reasoning description SHALL remain muted while current and default markers retain their semantic roles
- **AND** the aligned columns, selected value, and Enter and Space actions SHALL remain unchanged

#### Scenario: Highlight a slash command

- **WHEN** a command is selected in the bare-A1 `/` menu
- **THEN** its existing `→` SHALL remain accent-colored, its command label SHALL use normal `text`, and its description SHALL remain muted on `selectedBg`
- **AND** the background SHALL end with the final visible command or description character
- **AND** navigation and completion behavior SHALL remain unchanged

#### Scenario: Render a selected row at narrow width

- **WHEN** any standard dialog renders its selected row with less width than the complete content requires
- **THEN** the row SHALL remain single-line and ANSI-aware clipped within the available content width
- **AND** every visible item cell SHALL retain the selection background
- **AND** cells after the visible item SHALL remain outside the selection background
- **AND** no rendered row SHALL exceed the frame width

#### Scenario: Render an unselected row

- **WHEN** a standard-dialog row is not selected
- **THEN** it SHALL retain its existing semantic foreground roles without the selected background or whole-row bold styling

#### Scenario: Use the pinned comparison profile

- **WHEN** the user runs the explicit `a1 pi` comparison profile
- **THEN** pinned Pi selector presentation SHALL remain unchanged by the bare-A1 selected-row treatment
