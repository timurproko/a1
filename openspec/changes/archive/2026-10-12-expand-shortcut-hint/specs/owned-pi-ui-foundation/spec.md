## ADDED Requirements

### Requirement: Collapsed tool output uses concise shortcut styling

When bare A1 presents an expansion hint for collapsed generic fallback or package built-in tool output, the hint SHALL use the shared quiet-key and muted-action roles and read `Ctrl+O expand` for the default binding. The key label SHALL reflect the effective tool-expansion binding. Expansion behavior, surrounding output, custom extension renderers, and the pinned comparison profile SHALL remain unchanged.

#### Scenario: Show omitted fallback output
- **WHEN** a generic fallback tool result contains more lines than its collapsed preview
- **THEN** the suffix SHALL retain the omitted-line count and end with `Ctrl+O expand)` using the shared key and action roles
- **AND** it SHALL NOT show lowercase `ctrl+o` or the connective wording `to expand`

#### Scenario: Show omitted built-in output
- **WHEN** a package built-in tool renderer, including Bash, presents an expansion hint for collapsed output
- **THEN** the existing hint geometry SHALL contain `Ctrl+O expand` using the shared key and action roles
- **AND** its omitted-line count, preview content, and other styling SHALL remain unchanged

#### Scenario: Show a compact built-in call
- **WHEN** a package built-in compact tool call presents an expansion hint
- **THEN** its existing parenthetical geometry SHALL contain `Ctrl+O expand` using the shared key and action roles
- **AND** its tool label, path, range, and interaction SHALL remain unchanged

#### Scenario: Resolve a customized expansion binding
- **WHEN** the effective tool-expansion binding differs from the default
- **THEN** every affected fallback and built-in hint SHALL display that effective key with shared display capitalization and the action `expand`
- **AND** invoking that key SHALL retain the existing expansion behavior

#### Scenario: Preserve unaffected tool presentation
- **WHEN** output is expanded, fits without an expansion hint, or uses a custom extension renderer
- **THEN** no concise hint SHALL be added to that output
- **AND** existing content, styling, geometry, and lifecycle SHALL remain unchanged

#### Scenario: Use the pinned comparison profile
- **WHEN** equivalent tool output is presented through `a1 pi`
- **THEN** its pinned shortcut wording and styling SHALL remain unchanged
