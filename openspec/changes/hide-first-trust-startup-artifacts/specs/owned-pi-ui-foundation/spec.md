## ADDED Requirements

### Requirement: Tool state backgrounds survive nested renderer styling
In bare A1, a tool surface using the default tool shell SHALL paint its pending, successful, or failed state background through every available content cell on each shell row. Foreground, emphasis, hyperlink, or background controls emitted by the nested call/result renderer SHALL remain scoped to their intended spans. When nested styling resets or returns to the default background, the enclosing tool-state background SHALL resume through the remaining text and trailing blank cells until the tool-shell row ends.

This background composition SHALL preserve existing text, padding, wrapping, collapse/expand behavior, explicit nested background spans, mouse behavior, and renderer lifecycle. It SHALL NOT alter the independent `a1 pi` comparison profile.

#### Scenario: Nested renderer resets before row end
- **WHEN** a pending, successful, or failed default-shell tool row contains internally styled text whose renderer emits SGR full reset or default-background reset before the available row ends
- **THEN** the renderer's intended foreground, emphasis, link, and explicit background spans SHALL remain visible
- **AND** every later cell through the tool shell's content boundary SHALL use the enclosing tool-state background

#### Scenario: Render short and wrapped tool content
- **WHEN** a tool call, result line, collapse hint, or hyperlink occupies less than the available width or wraps across multiple rows
- **THEN** each tool-shell row SHALL carry one continuous enclosing state background through its complete available width
- **AND** no row's background width SHALL depend on its final text or ANSI reset position

#### Scenario: Preserve an explicit nested background
- **WHEN** a nested renderer intentionally paints a bounded explicit background inside a tool row
- **THEN** that nested background SHALL remain unchanged for its declared span
- **AND** returning to the default background SHALL reveal the enclosing tool-state background rather than the terminal canvas

#### Scenario: Keep the comparison profile unchanged
- **WHEN** equivalent tool output is presented through `a1 pi`
- **THEN** its pinned comparison component and terminal-control ordering SHALL remain unchanged by bare A1's enclosing-background composition
