## MODIFIED Requirements

### Requirement: The bare-A1 thinking selector uses the established selector treatment
The bare-A1 thinking selector SHALL render `Thinking Level` in bold semantic accent color, matching the heading treatment used by the Models configuration surface. Its resolved cycle hint SHALL render in semantic muted grey on the immediately following row. Repeated available-level values SHALL collapse to one row. Each level SHALL render its description inline in semantic muted grey regardless of cursor selection, with every description aligned to the same column one separator after the widest rendered level-name and marker region. The active session level SHALL have exactly one semantic success-green checkmark immediately after its level name. The desired default level SHALL render the literal `[default]` marker in semantic muted grey within the primary label region immediately after that optional active checkmark and before the aligned description; when active and desired-default levels differ, each marker SHALL remain on the row for its own state. Space SHALL stage the highlighted level as the desired default without persisting or closing, Ctrl+S SHALL persist that staged default through the existing thinking workflow, Enter SHALL continue selecting the highlighted session level, and only Escape SHALL close the selector. Ctrl+C SHALL NOT close the selector or invoke cancellation. The shortcut footer SHALL use semantic hint styling and read `Enter select  Space default  Ctrl+S save  Esc close`. While the selector is open, the shell footer SHALL omit its thinking-level suffix so the active level is not duplicated below the selector, then restore that suffix when the selector closes. The interaction change SHALL preserve the selector's borders, search input, navigation, filtering, focus, restoration behavior, and comparison-profile isolation.

#### Scenario: Render the thinking selector heading
- **WHEN** the user opens the bare-A1 thinking selector
- **THEN** the heading SHALL read `Thinking Level`
- **AND** every heading cell SHALL use the active theme's accent color and bold emphasis
- **AND** the resolved cycle hint SHALL use semantic muted grey on the row directly below the heading

#### Scenario: Render level rows
- **WHEN** the selector displays selected and unselected level rows
- **THEN** repeated available-level values SHALL render exactly once
- **AND** each description SHALL use semantic muted grey and begin in the same aligned column
- **AND** only the active session level SHALL place one semantic success-green checkmark immediately after its name
- **AND** the desired default level SHALL place a semantic muted-grey `[default]` after its optional active checkmark and before its description
- **AND** a level that is both active and the desired default SHALL render its primary state as `<level> ✓ [default]`
- **AND** differing active and desired-default levels SHALL display only their respective markers
- **AND** the shell footer SHALL omit its thinking-level suffix until the selector closes
- **AND** closing the selector SHALL restore the shell footer's current thinking-level suffix

#### Scenario: Interact with the styled selector
- **WHEN** the user filters or navigates levels, selects a session level, stages or saves a default level, or closes the selector
- **THEN** the selector SHALL retain its specified interaction and restoration outcomes
- **AND** heading and row styling SHALL NOT alter list geometry, focus, or instruction placement

#### Scenario: Stage and save a default level
- **WHEN** the user highlights a level and presses Space
- **THEN** the `[default]` marker SHALL move to that level without invoking persistence or closing the selector
- **AND** subsequent navigation SHALL NOT change the staged default
- **WHEN** the user then presses Ctrl+S
- **THEN** the selector SHALL pass the staged level to the existing default-persistence workflow

#### Scenario: Select or close
- **WHEN** the user presses Enter on a highlighted level
- **THEN** that level SHALL be selected for the session through the existing selection workflow
- **WHEN** the user presses Escape
- **THEN** the selector SHALL close and restore its parent surface
- **WHEN** the user presses Ctrl+C
- **THEN** the selector SHALL remain open and SHALL NOT invoke cancellation

#### Scenario: Render compact controls
- **WHEN** the bare-A1 thinking selector is open
- **THEN** its semantic shortcut footer SHALL read `Enter select  Space default  Ctrl+S save  Esc close` in that order
- **AND** it SHALL NOT advertise `Escape/Ctrl+C` or use the verbose `to select`, `to set as default`, or `to cancel` wording

#### Scenario: Preserve comparison behavior
- **WHEN** the user opens the thinking selector through `a1 pi`
- **THEN** the pinned comparison selector SHALL retain its existing interactions and presentation
