## MODIFIED Requirements

### Requirement: An input row and a status line are components
The component layer SHALL provide the input row a screen uses for search and inline editing — an optional presentation-only prompt marker, the text, a block caret over the cell it is on, and a quiet placeholder while empty — and the status line a screen uses to say one thing at a time. A screen SHALL NOT compose either from escapes of its own. The shared input component SHALL support a main-prompt prefix with leading inset and a marker-free auxiliary-input prefix while keeping one geometry and rendering implementation for rules, caret, placeholder, clipping, and content width. Bare A1's agent prompt and Settings search SHALL use this reusable input presentation while retaining their respective multiline editor and single-line filter behavior. Sharing only color constants while independently composing equivalent input chrome SHALL NOT satisfy this requirement.

#### Scenario: Render an empty input row
- **WHEN** the input row is shown with no text
- **THEN** the placeholder SHALL be shown quietly with the caret over its first cell
- **AND** the placeholder SHALL begin at the content start selected by that surface's prefix configuration

#### Scenario: Report something on the status line
- **WHEN** a screen has both a standing hint and something to report
- **THEN** the status line SHALL show what is reported until it is superseded

#### Scenario: Render agent and search input chrome
- **WHEN** the bare-A1 main agent prompt is rendered
- **THEN** the shared component SHALL supply one leading blank cell, the `❯` marker, and the established marker-to-content spacing
- **AND** those presentation cells SHALL NOT change semantic text offsets

#### Scenario: Render an auxiliary input without a marker
- **WHEN** Settings search or an A1-owned Agent auxiliary input is rendered
- **THEN** the shared component SHALL supply its rules and content inset without a chevron or greater-than marker
- **AND** the surface SHALL retain its existing text editing, caret, focus, and submission or filtering behavior
