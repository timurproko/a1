## MODIFIED Requirements

### Requirement: The bare-A1 thinking selector uses the established selector treatment
The bare-A1 thinking selector SHALL render `Thinking Level` in bold semantic accent color, matching the heading treatment used by the Models configuration surface. Its resolved cycle hint SHALL render in semantic muted grey on the immediately following row. Repeated available-level values SHALL collapse to one row. Each level SHALL render its description inline in semantic muted grey regardless of cursor selection, with every description aligned to the same column one separator after the widest rendered level-name and marker region. The active session level SHALL have exactly one semantic success-green checkmark immediately after its level name. The configured default level SHALL render the literal `[default]` marker in semantic muted grey within the primary label region immediately after that optional active checkmark and before the aligned description; when active and default differ, each marker SHALL remain on the row for its own state. While the selector is open, the footer SHALL omit its thinking-level suffix so the active level is not duplicated below the selector, then restore that suffix when the selector closes. The presentation change SHALL preserve the selector's borders, search input, navigation, selection, default persistence, cancellation, focus, and restoration behavior.

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
- **AND** the configured default level SHALL place a semantic muted-grey `[default]` after its optional active checkmark and before its description
- **AND** a level that is both active and configured as default SHALL render its primary state as `<level> ✓ [default]`
- **AND** differing active and configured-default levels SHALL display only their respective markers
- **AND** the footer SHALL omit its thinking-level suffix until the selector closes
- **AND** closing the selector SHALL restore the footer's current thinking-level suffix

#### Scenario: Interact with the styled selector
- **WHEN** the user filters or navigates levels, selects a session level, saves a default level, or cancels the selector
- **THEN** the selector SHALL retain its existing interaction and restoration outcomes
- **AND** heading and row styling SHALL NOT alter list geometry, focus, or instruction placement
