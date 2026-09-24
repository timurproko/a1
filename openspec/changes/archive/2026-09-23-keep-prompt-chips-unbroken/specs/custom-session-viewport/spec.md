## ADDED Requirements

### Requirement: Submitted prompt chips wrap as atomic units

Bare A1 SHALL treat each canonical text-paste, image, file, folder, and URL chip label in submitted user-prompt text as one visual wrapping unit whenever the complete label fits within the prompt's full content width. When the remaining columns on a row cannot contain a fitting chip, the complete chip SHALL begin on the next continuation row rather than split at an internal space.

If one chip is wider than the complete available content width, its visual presentation MAY split at grapheme boundaries as required to keep every rendered row within the declared width. Atomic wrapping SHALL be presentation-only: source text, visible chip characters and spaces, Markdown styling outside chips, hyperlinks, timestamps, sticky-prompt behavior, transcript selection/copy, stored/model-facing content, attachment behavior, and live editor semantics SHALL remain unchanged. Ordinary bracketed text that is not canonical chip syntax SHALL retain normal Markdown wrapping, and the `a1 pi` comparison route SHALL retain pinned rendering.

#### Scenario: Move a fitting screenshot chip to the next row

- **WHEN** prose leaves too few columns for a complete canonical screenshot chip but the chip fits within a full prompt content row
- **THEN** the current row SHALL end before the chip
- **AND** the next continuation row SHALL contain the complete chip without an internal split

#### Scenario: Wrap every canonical chip family consistently

- **WHEN** submitted prompt text contains canonical text-paste, image, file, folder, or URL chip labels near a row boundary
- **THEN** every fitting chip SHALL wrap as one unit using the same canonical syntax recognized by prompt-chip behavior
- **AND** adjacent or repeated chips SHALL remain complete individual units

#### Scenario: Render a chip wider than the prompt

- **WHEN** one canonical chip is wider than the complete prompt content width
- **THEN** its visual fallback SHALL preserve all chip content in order across width-bounded rows
- **AND** no row SHALL exceed the available width or split a grapheme cluster

#### Scenario: Preserve submitted-prompt presentation and content

- **WHEN** a submitted prompt contains chips together with Markdown, a URL hyperlink, a source timestamp, sticky-row presentation, or transcript selection
- **THEN** the chip labels SHALL retain their exact visible characters and ordinary spaces after wrapping
- **AND** styling, hyperlinks, timestamp placement, sticky behavior, selected/copied text, stored content, and model-facing content SHALL remain unchanged

#### Scenario: Preserve ordinary bracketed text and comparison rendering

- **WHEN** submitted text contains a non-chip bracketed span or the same prompt is rendered through `a1 pi`
- **THEN** ordinary Markdown wrapping or pinned comparison rendering SHALL remain unchanged
