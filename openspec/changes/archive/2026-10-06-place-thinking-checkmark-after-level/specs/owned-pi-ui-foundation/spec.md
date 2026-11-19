## MODIFIED Requirements

### Requirement: The bare-A1 thinking selector uses the established selector treatment
The bare-A1 thinking selector SHALL render `Thinking Level` in bold semantic accent color, matching the heading treatment used by the Models configuration surface. Its resolved cycle hint SHALL render in semantic muted grey on the immediately following row. Repeated available-level values SHALL collapse to one row. Every level row SHALL begin with a fixed-width exclusive-radio marker that differs from the Models dialog's multi-select state: the configured default SHALL use exactly one semantic accent-colored `◉`, and every non-default level SHALL use a semantic dim `○`. One space after that marker, every row SHALL render its unpadded level name. The active session level SHALL have exactly one semantic success-green checkmark one space immediately after the final visible cell of its level name, matching the item-adjacent active treatment used by other dialogs; the checkmark SHALL NOT be delayed to a shared marker column. Width-balancing padding SHALL follow the optional active marker so every description renders inline in semantic muted grey and begins at the same column regardless of active/default placement. The selector SHALL NOT render the textual `[default]` marker. Space SHALL immediately persist the highlighted level as the configured global default, move the single selected radio to that row, and replace the previous row's marker with an unselected radio without closing the selector, changing the active session level, or creating an unsaved state. Enter SHALL continue selecting the highlighted session level, and only Escape SHALL close the selector. Ctrl+C SHALL NOT close the selector or invoke cancellation. The shortcut footer SHALL use semantic hint styling and read `Enter select  Space default  Esc close`. While the selector is open, the shell footer SHALL omit its thinking-level suffix so the active level is not duplicated below the selector, then restore that suffix when the selector closes. The interaction change SHALL preserve the selector's borders, search input, navigation, filtering, focus, restoration behavior, narrow-width bounds, and comparison-profile isolation.

#### Scenario: Render the thinking selector heading
- **WHEN** the user opens the bare-A1 thinking selector
- **THEN** the heading SHALL read `Thinking Level`
- **AND** every heading cell SHALL use the active theme's accent color and bold emphasis
- **AND** the resolved cycle hint SHALL use semantic muted grey on the row directly below the heading

#### Scenario: Render level rows
- **WHEN** the selector displays selected and unselected level rows
- **THEN** repeated available-level values SHALL render exactly once
- **AND** every row SHALL begin with a fixed exclusive-radio marker followed by one space and the unpadded level name
- **AND** only the configured default level SHALL use a semantic accent-colored `◉`
- **AND** every non-default level SHALL use a semantic dim `○`
- **AND** no row SHALL render the Models multi-select `●` or the textual `[default]` marker
- **AND** only the active session level SHALL place one semantic success-green checkmark one space immediately after its name
- **AND** trailing width-balancing space SHALL follow the optional active checkmark rather than separate it from the name
- **AND** every description SHALL use semantic muted grey and begin at the same column regardless of active/default placement
- **AND** the shell footer SHALL omit its thinking-level suffix until the selector closes
- **AND** closing the selector SHALL restore the shell footer's current thinking-level suffix

#### Scenario: Interact with the styled selector
- **WHEN** the user filters or navigates levels, selects a session level, changes the default level, or closes the selector
- **THEN** the selector SHALL retain its specified interaction and restoration outcomes
- **AND** heading and row styling SHALL NOT alter list geometry, narrow-width bounds, focus, or instruction placement

#### Scenario: Stage and save a default level
- **WHEN** the user highlights a level and presses Space
- **THEN** the single selected radio `◉` SHALL move to that level immediately
- **AND** the previous default row SHALL render `○`
- **AND** that level SHALL be persisted as the global default immediately
- **AND** the selector SHALL remain open
- **AND** the active session level and its item-adjacent checkmark SHALL remain unchanged
- **AND** no unsaved label or staged state SHALL appear

#### Scenario: Select or close
- **WHEN** the user presses Enter on a highlighted level
- **THEN** that level SHALL be selected for the session through the existing selection workflow
- **WHEN** the user presses Escape
- **THEN** the selector SHALL close and restore its parent surface
- **WHEN** the user presses Ctrl+C
- **THEN** the selector SHALL remain open and SHALL NOT invoke cancellation

#### Scenario: Render compact controls
- **WHEN** the bare-A1 thinking selector is open
- **THEN** its semantic shortcut footer SHALL read `Enter select  Space default  Esc close` in that order
- **AND** it SHALL NOT advertise Ctrl+S, `Escape/Ctrl+C`, or the verbose `to select`, `to set as default`, or `to cancel` wording

#### Scenario: Preserve comparison behavior
- **WHEN** the user opens the thinking selector through `a1 pi`
- **THEN** the pinned comparison selector SHALL retain its existing interactions and presentation
