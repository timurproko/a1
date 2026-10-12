## ADDED Requirements

### Requirement: Bare-A1 read-call ranges use the secondary accent tone
Built-in read call headers in bare A1 SHALL paint line-range suffixes with the active `mdHeading` role used by Settings section headings. This presentation SHALL leave read arguments and execution unchanged, keep real warnings on `warning`, preserve extension renderer ownership, and leave `a1 pi` on pinned presentation.

#### Scenario: Render an offset and limit
- **WHEN** bare A1 renders a built-in read call with offset 95 and limit 170
- **THEN** the header SHALL show `:95-264` with the same effective foreground as the current Settings section-heading role
- **AND** the read title, path, range calculation, spacing, and geometry SHALL remain unchanged

#### Scenario: Change the accent while a read call is visible
- **WHEN** the reader changes the bare-A1 accent while a built-in read call with a range is visible
- **THEN** the range SHALL repaint with the newly derived secondary-heading tone
- **AND** no range rendered later SHALL retain the prior accent family

#### Scenario: Render read warnings and custom presentation
- **WHEN** a read result emits a truncation or size warning, or an extension supplies its own read-call renderer
- **THEN** actual warnings SHALL retain the semantic warning role
- **AND** extension-owned presentation SHALL receive the ordinary theme without an A1 range-style override

#### Scenario: Use the comparison profile
- **WHEN** the same read call is rendered through `a1 pi`
- **THEN** its complete call and result presentation SHALL retain pinned Pi theme semantics and bytes
