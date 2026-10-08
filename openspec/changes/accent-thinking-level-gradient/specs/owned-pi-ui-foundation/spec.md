## RENAMED Requirements

- FROM: `### Requirement: The status-bar level name carries the existing thinking color`
- TO: `### Requirement: The status-bar level name follows the active accent intensity`

## MODIFIED Requirements

### Requirement: The status-bar level name follows the active accent intensity
Bare A1 SHALL color the status-bar thinking-level name with a fixed semantic intensity scale ordered `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. The `off` endpoint SHALL exactly match the active theme's semantic dim-grey foreground, the `xhigh` endpoint SHALL exactly match the active theme's semantic accent foreground, and the four intermediate levels SHALL use evenly positioned perceptual gradations between those endpoints. A named level's position SHALL remain fixed when a model supports only a subset of the canonical levels. The level label and color SHALL update from authoritative session state after level cycling, setting changes, model changes, session restoration, and active-accent changes.

Only the primary active level name SHALL receive the gradient color; surrounding model, provider, usage, path, separators, routed-model details, and extension statuses SHALL retain their existing presentation. The gradient SHALL NOT change editor-border or selector colors. A selected model with level `off` SHALL show the dim-grey `off` label; when no model is selected, the footer SHALL NOT invent an active level. Unsupported levels SHALL continue to use the engine's supported-level and clamping behavior rather than introducing a new cycle order. `a1 pi` SHALL retain pinned footer behavior.

#### Scenario: Render the gradient endpoints
- **WHEN** bare A1 renders `off` for an active model
- **THEN** the complete level-name span SHALL match the active theme's semantic dim-grey foreground exactly
- **WHEN** bare A1 renders `xhigh` for an active model
- **THEN** the complete level-name span SHALL match the active theme's semantic accent foreground exactly

#### Scenario: Render intermediate levels
- **WHEN** bare A1 renders `minimal`, `low`, `medium`, or `high`
- **THEN** the complete level-name span SHALL use that level's evenly positioned gradation between dim grey and accent
- **AND** the same named level SHALL keep the same gradient position when the active model exposes only a subset of levels

#### Scenario: Cycle supported levels
- **WHEN** the user cycles through a model's supported levels
- **THEN** the visible level name SHALL update to the authoritative level and use its fixed gradient position
- **AND** both input bars SHALL retain their existing presentation and the level color SHALL NOT be muted by surrounding footer styling

#### Scenario: Disable thinking
- **WHEN** the selected model's authoritative level becomes `off`
- **THEN** the status bar SHALL display the `off` label in exact semantic dim grey and the input bars SHALL remain unchanged

#### Scenario: Change the active accent
- **WHEN** the selected semantic accent changes while a level is visible
- **THEN** the visible level name SHALL repaint from the new accent endpoint in the same session
- **AND** `xhigh` SHALL exactly match the new accent while `off` remains exactly semantic dim grey

#### Scenario: Change models or restore a session
- **WHEN** a model change or session restoration changes the effective thinking level
- **THEN** the footer SHALL display and color that effective level rather than retaining the prior model's label or gradient position

#### Scenario: Preserve adjacent presentation
- **WHEN** bare A1 renders any active level
- **THEN** model and provider names, separators, usage, path, routed-model details, extension statuses, and editor borders SHALL retain their existing colors and behavior

#### Scenario: Render without an active model
- **WHEN** no model is selected
- **THEN** the existing no-model status SHALL remain and no active thinking-level label SHALL be fabricated

#### Scenario: Fit a narrow terminal
- **WHEN** the footer must omit provider text or truncate its right-hand content to fit
- **THEN** its existing width and truncation policy SHALL remain intact and any visible level-name span SHALL retain its gradient foreground without coloring adjacent text

#### Scenario: Use the comparison profile
- **WHEN** the same level is rendered through `a1 pi`
- **THEN** pinned Pi footer styling SHALL remain unchanged
