## ADDED Requirements

### Requirement: The settings screen uses the framed A1 visual hierarchy
The owned settings screen SHALL open with a full-width rule in the active theme's border role followed by a one-column-inset `Settings` title in bold accent role. Those opening rows SHALL scroll away with settings content; only the active settings section header SHALL pin at the top. An ordinary full-width border-role rule SHALL remain fixed between settings content and footer guidance. While search is active, the top rule of the established three-row shared input component SHALL replace that ordinary divider, followed by the input row and its bottom rule. In the dark theme shown by the product these roles SHALL remain the established blue border and cyan accent colors. Settings section headers, including a sticky header, SHALL render bold in the theme's heading role, which SHALL match the yellow Markdown-heading color used by `What's New`. Section rows, setting-row leading markers, and footer guidance SHALL begin at the title's one-column inset. Setting labels, selected rows, values, notes, menus, dialogs, search, notices, and footer guidance SHALL retain their established semantic roles.

The list, changing visible title offset, sticky-header calculation, scrollbar, pointer hit regions, value menus, structured dialog, search input, and footer SHALL share one current content rectangle. Horizontal and vertical offsets SHALL be reflected in pointer and overlay coordinates. Every terminal size SHALL still produce exactly the requested row count with no row wider than the requested width.

#### Scenario: Open the framed settings screen
- **WHEN** the user opens `/settings` with the ordinary dark theme
- **THEN** the screen SHALL show a full-width blue top rule, a bold cyan `Settings` title inset by one column, and a full-width blue rule above the footer
- **AND** `Generic`, `Scroll`, `History`, `Agent`, and every other settings section heading SHALL be bold yellow
- **AND** section headings, setting-row leading markers, and footer guidance SHALL align with the title's left edge
- **AND** setting rows and values SHALL retain their existing selected, unselected, and hover colors

#### Scenario: Scroll the framed settings list
- **WHEN** the settings entries overflow and the user scrolls or jumps between sections
- **THEN** the top rule and `Settings` title SHALL scroll out of view
- **AND** only the visible section heading SHALL pin at the top in the yellow heading role
- **AND** the footer divider and guidance SHALL remain fixed
- **AND** the scrollbar thumb and pointer targets SHALL correspond to the rows visibly drawn above the footer

#### Scenario: Open the established search input
- **WHEN** the user opens settings search
- **THEN** the shared input SHALL retain its top rule, prompt row, and bottom rule
- **AND** its top rule SHALL replace, rather than duplicate, the ordinary bottom divider
- **AND** the list SHALL yield only the additional rows needed by the prompt and bottom rule
- **AND** the left-aligned shortcut guidance SHALL remain below the input

#### Scenario: Use menus or a structured dialog
- **WHEN** the user opens a scalar value menu or a structured-setting dialog
- **THEN** any visible opening frame rows and title SHALL retain their border and accent roles
- **AND** the active menu, dialog, notices, and guidance SHALL retain their established composition, colors, keyboard behavior, and pointer behavior without being displaced outside the screen

#### Scenario: Render a constrained settings frame
- **WHEN** the settings screen is rendered at a narrow width or a height smaller than its ordinary chrome and content
- **THEN** the frame SHALL prioritize rows from the top in stable order, clip ANSI-aware, and fill exactly the requested rectangle
- **AND** it SHALL NOT emit an over-width row, an embedded line break, or a pointer target for a row that is not visible
