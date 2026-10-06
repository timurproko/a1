## ADDED Requirements

### Requirement: Standard bare-A1 dialogs share one selected-row presentation

The bare-A1 Models, Skills, Thinking Level, and Session Tree dialogs SHALL present their selected list row with the ordinary menu arrow `→`, an accent primary label, muted descriptive text, and the subtle purple `customMessageBg` selection background. The selected background SHALL extend across the available dialog content width, including otherwise unused cells after the row content, without extending beyond the frame or causing wrapping. Selection SHALL NOT bold the whole row.

The selected-row treatment SHALL preserve domain-specific semantic markers and content. Models SHALL retain its scoped/unscoped marker, provider badge, and active-model checkmark. Skills SHALL retain its `skill:<name>` label and separately presented selected description. Thinking Level SHALL retain aligned level, current, default, and reasoning-description columns. Session Tree SHALL retain its specialized hierarchy, role labels, and horizontal viewport.

Unselected rows, search and filter behavior, list ordering, counters, descriptions, navigation, selection actions, default and scope persistence, cancellation, and dialog lifecycle SHALL remain unchanged. The explicit `a1 pi` comparison profile SHALL retain pinned Pi presentation.

#### Scenario: Highlight a model

- **WHEN** a model row is selected in the Models dialog
- **THEN** its arrow and model identifier SHALL use accent foreground on `customMessageBg`
- **AND** its provider badge SHALL remain muted and its scope and active-state markers SHALL retain their semantic roles
- **AND** the background SHALL fill the available content width without changing the row order or model action

#### Scenario: Highlight a skill

- **WHEN** a skill row is selected in the Skills dialog
- **THEN** its arrow and `skill:<name>` label SHALL use accent foreground on `customMessageBg`
- **AND** the background SHALL fill the available content width
- **AND** the selected skill description SHALL remain separately muted below the list

#### Scenario: Highlight a thinking level

- **WHEN** a thinking-level row is selected
- **THEN** its arrow and level SHALL use accent foreground on `customMessageBg`
- **AND** its reasoning description SHALL remain muted while current and default markers retain their semantic roles
- **AND** the aligned columns, selected value, and Enter and Space actions SHALL remain unchanged

#### Scenario: Render a selected row at narrow width

- **WHEN** any standard dialog renders its selected row with less width than the complete content requires
- **THEN** the row SHALL remain single-line and ANSI-aware clipped within the available content width
- **AND** every visible selected cell SHALL retain the selection background
- **AND** no rendered row SHALL exceed the frame width

#### Scenario: Render an unselected row

- **WHEN** a standard-dialog row is not selected
- **THEN** it SHALL retain its existing semantic foreground roles without the selected background or whole-row bold styling

#### Scenario: Use the pinned comparison profile

- **WHEN** the user runs the explicit `a1 pi` comparison profile
- **THEN** pinned Pi selector presentation SHALL remain unchanged by the bare-A1 selected-row treatment
