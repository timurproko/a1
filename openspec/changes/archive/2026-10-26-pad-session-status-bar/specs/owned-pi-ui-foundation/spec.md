## ADDED Requirements

### Requirement: Bare A1 insets every session status-bar row

Bare A1 SHALL reserve exactly one terminal cell between visible session footer/status-bar content and each horizontal terminal edge whenever the terminal is wide enough to contain content between those gutters. The shell SHALL apply this inset uniformly to the built-in repository path row, usage/model row, merged extension-status rows, and every row produced by an extension-provided custom footer. Footer components SHALL receive the inner content width so their own wrapping, truncation, and alignment fit within the gutters, and the shell SHALL keep returned rows ANSI-safe and width-bounded even when an extension returns over-wide content. At widths too small for content plus both gutters, the footer SHALL preserve its row allocation without drawing content in an edge cell. The explicit `a1 pi` comparison profile SHALL retain its pinned footer presentation.

#### Scenario: Inset every built-in status-bar row

- **WHEN** bare A1 renders its repository path and usage/model footer rows
- **THEN** each row's first terminal cell and last terminal cell SHALL remain blank
- **AND** the existing footer content, ordering, styling, and selection ownership SHALL remain between those gutters

#### Scenario: Inset merged extension status

- **WHEN** an extension contributes footer status text through the standard status API
- **THEN** the resulting status row SHALL use the same one-cell left and right gutters as the built-in rows
- **AND** its text SHALL remain within the inner width

#### Scenario: Inset every custom extension footer line

- **WHEN** an extension replaces the footer with a component that returns multiple rows
- **THEN** every returned row SHALL receive the same one-cell left and right gutters
- **AND** the component SHALL render against the reduced inner width without requiring plugin-specific padding

#### Scenario: Bound an over-wide custom footer

- **WHEN** a custom footer returns ANSI-styled content wider than the inner width
- **THEN** the shell SHALL truncate it safely before the right gutter
- **AND** styling SHALL NOT leak into the gutter or another row

#### Scenario: Preserve gutters at tiny widths

- **WHEN** the terminal is too narrow to show footer content between both gutters
- **THEN** the footer SHALL preserve its row allocation without placing visible content in the first or last terminal cell
- **AND** no rendered row SHALL exceed the terminal width

#### Scenario: Keep the Pi comparison footer unchanged

- **WHEN** the same footer state renders through the explicit `a1 pi` comparison profile
- **THEN** it SHALL retain the pinned full-width footer bytes without the bare-A1 gutter customization
