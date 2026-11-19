## ADDED Requirements

### Requirement: Bare A1 declares shared input and status-level presentation
Bare A1 SHALL use the shared agent/search input presentation and status-level color behavior as an explicit A1-owned customization over the pinned shell. This customization SHALL supersede pinned editor border coloring and thinking-label styling only in bare A1; it SHALL NOT change pinned `a1 pi` presentation, extension-provided custom editors, engine semantics, or other footer values. Bare-A1 keyboard defaults SHALL follow the declared level-cycle and model-selector shortcut policy instead of pinned defaults.

#### Scenario: Open the pinned comparison profile
- **WHEN** the user starts `a1 pi`
- **THEN** editor thinking-level and bash-mode border colors, footer presentation, Shift+Tab level cycling, and Ctrl+L model selection SHALL retain pinned behavior

#### Scenario: Use the owned agent input
- **WHEN** the user starts bare A1 with its default agent editor
- **THEN** the input SHALL use the shared neutral rules and undimmed prefix specified for Settings search
- **AND** prompt history, paste chips, selection and copy, suggestions, streaming, submission, and bash execution SHALL retain their existing semantics

### Requirement: The status-bar level name carries the existing thinking color
Bare A1 SHALL color the status-bar thinking-level name with the same active-theme mapping previously used for that level's editor bars. The level label SHALL update from authoritative session state after level cycling, setting changes, model changes, and session restoration. Only the level name SHALL receive that color; surrounding model, provider, usage, path, separators, and extension statuses SHALL retain their existing presentation. A selected model with level off SHALL show an off label using the existing off-level mapping; when no model is selected, the footer SHALL NOT invent an active level. Unsupported levels SHALL continue to use the engine's supported-level and clamping behavior rather than introducing a new cycle order.

#### Scenario: Cycle supported levels
- **WHEN** the user cycles through a model's supported levels
- **THEN** the visible level name SHALL update to the authoritative level and use the corresponding previous bar color
- **AND** both input bars SHALL remain neutral and the level color SHALL NOT be muted by surrounding footer styling

#### Scenario: Disable thinking
- **WHEN** the selected model's authoritative level becomes off
- **THEN** the status bar SHALL display the off label in the existing off-level color and the input bars SHALL remain neutral

#### Scenario: Change models or restore a session
- **WHEN** a model change or session restoration changes the effective thinking level
- **THEN** the footer SHALL display and color that effective level rather than retaining the prior model's label or color

#### Scenario: Render without an active model
- **WHEN** no model is selected
- **THEN** the existing no-model status SHALL remain and no active thinking-level label SHALL be fabricated

#### Scenario: Fit a narrow terminal
- **WHEN** the footer must omit provider text or truncate its right-hand content to fit
- **THEN** its existing width and truncation policy SHALL remain intact and any visible level-name span SHALL retain its level foreground without coloring adjacent text
