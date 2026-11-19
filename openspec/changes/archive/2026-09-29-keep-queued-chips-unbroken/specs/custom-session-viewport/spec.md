## ADDED Requirements

### Requirement: Pending steering chips wrap as atomic units

Bare A1 SHALL treat each canonical text-paste, image, file, folder, and URL chip label in pending `Steering:` content as one visual wrapping unit whenever the complete label fits within the full available content width, whether authored whitespace separates the chip or it directly touches other text. When the remaining columns on a row cannot contain a fitting chip, the complete chip SHALL begin on the next continuation row rather than split internally.

If one chip is wider than the complete available width, bare A1 SHALL truncate its visual label with `…` on one width-bounded row rather than split it. Atomic wrapping SHALL be presentation-only: queued source text, queue ordering, dequeue guidance, scrolling behavior, attachment behavior, and queue lifecycle SHALL remain unchanged. The pinned `a1 pi` comparison presentation SHALL retain its existing wrapping.

#### Scenario: Move a fitting queued screenshot chip to the next row

- **WHEN** preceding steering text leaves too few columns for a complete canonical screenshot chip but the chip fits within a full content row
- **THEN** the current row SHALL end before the chip
- **AND** the next continuation row SHALL contain the complete chip without an internal split

#### Scenario: Wrap every canonical queued chip family consistently

- **WHEN** pending steering content contains canonical text-paste, image, file, folder, or URL chip labels near a row boundary
- **THEN** every fitting chip SHALL wrap as one unit using the same canonical syntax recognized by prompt-chip behavior
- **AND** adjacent or repeated chips SHALL remain complete individual units

#### Scenario: Isolate a queued chip from uninterrupted text

- **WHEN** a fitting canonical chip directly touches an overlong non-whitespace run before or after it
- **THEN** wrapping SHALL treat the chip as a separate atomic unit without requiring an authored space
- **AND** the rendered and queued text SHALL NOT gain visible separators

#### Scenario: Truncate an oversized queued chip atomically

- **WHEN** one canonical chip is wider than the complete steering-content width
- **THEN** its visual label SHALL be truncated with `…` on exactly one width-bounded row
- **AND** the queued source SHALL retain the complete chip without splitting a grapheme cluster

#### Scenario: Preserve queue behavior and comparison rendering

- **WHEN** queued steering content changes, is dequeued, scrolls with the transient viewport tail, contains ordinary non-chip bracketed text, or is rendered through `a1 pi`
- **THEN** atomic chip wrapping SHALL NOT alter queue content, ordering, guidance, lifecycle, viewport ownership, ordinary text semantics, or pinned comparison presentation

## MODIFIED Requirements

### Requirement: Submitted prompt chips wrap as atomic units

Bare A1 SHALL treat each canonical text-paste, image, file, folder, and URL chip label in submitted user-prompt text as one visual wrapping unit whenever the complete label fits within the prompt's full content width, whether authored whitespace separates the chip or it directly touches other text. When the remaining columns on a row cannot contain a fitting chip, the complete chip SHALL begin on the next continuation row rather than split internally.

If one chip is wider than the complete available content width, bare A1 SHALL truncate its visual label with `…` on one width-bounded row rather than split it. Atomic wrapping SHALL be presentation-only: source text, Markdown styling outside chips, hyperlinks, timestamps, sticky-prompt behavior, stored/model-facing content, attachment behavior, and live editor semantics SHALL remain unchanged. Ordinary bracketed text that is not canonical chip syntax SHALL retain normal Markdown wrapping, and the `a1 pi` comparison route SHALL retain pinned rendering.

#### Scenario: Move a fitting screenshot chip to the next row

- **WHEN** prose, including an uninterrupted run directly touching a canonical screenshot chip, leaves too few columns for the complete chip but the chip fits within a full prompt content row
- **THEN** the current row SHALL end before the chip
- **AND** the next continuation row SHALL contain the complete chip without an internal split

#### Scenario: Wrap every canonical chip family consistently

- **WHEN** submitted prompt text contains canonical text-paste, image, file, folder, or URL chip labels near a row boundary
- **THEN** every fitting chip SHALL wrap as one unit using the same canonical syntax recognized by prompt-chip behavior
- **AND** chips touching prose, adjacent chips, and repeated chips SHALL remain complete individual units without gaining visible separators

#### Scenario: Render a chip wider than the prompt

- **WHEN** one canonical chip is wider than the complete prompt content width
- **THEN** its visual label SHALL be truncated with `…` on exactly one width-bounded row
- **AND** the stored and model-facing source SHALL retain the complete chip without splitting a grapheme cluster

#### Scenario: Preserve submitted-prompt presentation and content

- **WHEN** a submitted prompt contains chips together with Markdown, a URL hyperlink, a source timestamp, sticky-row presentation, transcript selection, or directly touching prose
- **THEN** every fitting chip and its surrounding source SHALL retain exact visible characters and authored spacing, while only an oversized chip label MAY use the declared ellipsis
- **AND** styling, hyperlinks, timestamp placement, sticky behavior, stored content, and model-facing content SHALL remain unchanged

#### Scenario: Preserve ordinary bracketed text and comparison rendering

- **WHEN** submitted text contains a non-chip bracketed span or the same prompt is rendered through `a1 pi`
- **THEN** ordinary Markdown wrapping or pinned comparison rendering SHALL remain unchanged
