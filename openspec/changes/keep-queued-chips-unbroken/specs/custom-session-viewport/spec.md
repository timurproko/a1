## ADDED Requirements

### Requirement: Pending steering chips wrap as atomic units

Bare A1 SHALL treat each canonical text-paste, image, file, folder, and URL chip label in pending `Steering:` content as one visual wrapping unit whenever the complete label fits within the full available content width. When the remaining columns on a row cannot contain a fitting chip, the complete chip SHALL begin on the next continuation row rather than split at an internal space.

If one chip is wider than the complete available width, its visual presentation MAY split at grapheme boundaries as required to keep every rendered row within that width. Atomic wrapping SHALL be presentation-only: queued source text, visible chip characters and spaces, queue ordering, dequeue guidance, scrolling behavior, attachment behavior, and queue lifecycle SHALL remain unchanged. The pinned `a1 pi` comparison presentation SHALL retain its existing wrapping.

#### Scenario: Move a fitting queued screenshot chip to the next row

- **WHEN** preceding steering text leaves too few columns for a complete canonical screenshot chip but the chip fits within a full content row
- **THEN** the current row SHALL end before the chip
- **AND** the next continuation row SHALL contain the complete chip without an internal split

#### Scenario: Wrap every canonical queued chip family consistently

- **WHEN** pending steering content contains canonical text-paste, image, file, folder, or URL chip labels near a row boundary
- **THEN** every fitting chip SHALL wrap as one unit using the same canonical syntax recognized by prompt-chip behavior
- **AND** adjacent or repeated chips SHALL remain complete individual units

#### Scenario: Render an oversized queued chip safely

- **WHEN** one canonical chip is wider than the complete steering-content width
- **THEN** its visual fallback SHALL preserve all chip content in order across width-bounded rows
- **AND** no row SHALL exceed the available width or split a grapheme cluster

#### Scenario: Preserve queue behavior and comparison rendering

- **WHEN** queued steering content changes, is dequeued, scrolls with the transient viewport tail, contains ordinary non-chip bracketed text, or is rendered through `a1 pi`
- **THEN** atomic chip wrapping SHALL NOT alter queue content, ordering, guidance, lifecycle, viewport ownership, ordinary text semantics, or pinned comparison presentation
