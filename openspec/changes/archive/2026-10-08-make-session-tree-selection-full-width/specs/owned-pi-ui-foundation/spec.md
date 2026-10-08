## MODIFIED Requirements

### Requirement: Standard bare-A1 lists share one selection palette

The bare-A1 Models, Skills, Thinking Level, Resume Session, Session Tree, Settings, and editor autocomplete menus SHALL preserve their existing cursor and meaningful semantic foreground roles when selected. Every covered surface SHALL use the blue `selectedBg` selection background. Models, Skills, Thinking Level, Settings, and autocomplete SHALL retain their ordinary menu arrow `→` in accent foreground, a primary label in normal `text`, and muted descriptive text. Resume Session SHALL use an accent arrow, preserve each title and metadata foreground role under keyboard selection, and render only its currently active session title in success green, while Session Tree SHALL retain each entry's item-specific foreground and text-style roles. Selection SHALL NOT introduce bold styling. On item-bounded surfaces, the selected background SHALL cover only the rendered item span from its arrow through its final visible content cell, SHALL NOT fill otherwise unused cells after the item, and SHALL remain clipped within the available width without causing wrapping. Resume Session and Session Tree SHALL use full-row selection geometry whose background fills every available row cell regardless of rendered content length.

The selected-item treatment SHALL preserve domain-specific semantic markers and content. Models SHALL retain its scoped/unscoped marker, provider badge, and active-model checkmark. Skills SHALL retain its `skill:<name>` label and separately presented selected description. Thinking Level SHALL retain aligned level, current, default, and reasoning-description columns. Settings SHALL retain aligned labels and values, steppers, structured-value rows, floating choices, scrolling, search, and pointer affordances. Autocomplete SHALL retain aligned command descriptions and completion behavior. Session Tree SHALL retain its hierarchy, semantic entry roles, horizontal viewport, clipped-edge markers, and full-row geometry. Resume Session SHALL retain its specialized arrow, metadata, active-session identity, and full-row geometry.

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

#### Scenario: Highlight a Resume Session entry

- **WHEN** a Resume Session entry is selected
- **THEN** its accent cursor SHALL appear while its title and metadata retain the same semantic foreground roles they have while unselected on the full-row blue `selectedBg`
- **AND** the currently active session title SHALL use the same success-green role as a checkmark independently of keyboard selection and without becoming bold
- **AND** search, scope, sort, rename, delete, navigation, and selection behavior SHALL remain unchanged

#### Scenario: Highlight a Session Tree entry

- **WHEN** a Session Tree entry is selected
- **THEN** its existing `→` SHALL remain accent-colored and every entry fragment SHALL keep the same semantic foreground and text-style role it has while unselected on `selectedBg`
- **AND** the background SHALL cover every available row cell, including trailing cells after short content and every visible clipped-edge ellipsis, without changing tree hierarchy or viewport behavior
- **AND** moving selection between entries of different rendered lengths SHALL NOT change the highlight width

#### Scenario: Highlight a setting

- **WHEN** a row is selected in the bare-A1 Settings screen, a structured-value panel, or a floating choice menu
- **THEN** its existing arrow or marker SHALL remain accent-colored, its primary label SHALL use normal `text`, and its value SHALL retain its normal semantic foreground on `selectedBg`
- **AND** the background SHALL end with the final visible value or control cell without filling unused screen width
- **AND** navigation, search, scrolling, pointer actions, and value persistence SHALL remain unchanged

#### Scenario: Highlight a slash command

- **WHEN** a command is selected in the bare-A1 `/` menu
- **THEN** its existing `→` SHALL remain accent-colored, its command label SHALL use normal `text`, and its description SHALL remain muted on `selectedBg`
- **AND** the background SHALL end with the final visible command or description character
- **AND** navigation and completion behavior SHALL remain unchanged

#### Scenario: Render a selected row at narrow width

- **WHEN** any covered item-bounded list renders its selected row with less width than the complete content requires
- **THEN** the row SHALL remain single-line and ANSI-aware clipped within the available content width
- **AND** every visible item cell SHALL retain the selection background
- **AND** cells after the visible item SHALL remain outside the selection background
- **AND** no rendered row SHALL exceed the frame width

#### Scenario: Render a full-row Session Tree selection at narrow width

- **WHEN** Session Tree renders a selected row with less width than the complete content requires
- **THEN** the row SHALL remain single-line and ANSI-aware clipped within the available content width
- **AND** every available row cell SHALL retain the selection background while clipped-edge markers remain visible
- **AND** no rendered row SHALL exceed the frame width

#### Scenario: Render an unselected row

- **WHEN** a covered row is not selected
- **THEN** it SHALL retain its existing semantic foreground roles without the selected background or whole-row bold styling

#### Scenario: Use the pinned comparison profile

- **WHEN** the user runs the explicit `a1 pi` comparison profile
- **THEN** pinned Pi selector presentation SHALL remain unchanged by the bare-A1 selected-row treatment
