## MODIFIED Requirements

### Requirement: Text is measured by display width
A1 SHALL measure, truncate, and pad text by terminal display width rather than by code units, accounting for wide characters, combining marks, and zero-width sequences, and SHALL NOT count styling escape sequences as visible width. Truncation SHALL NOT split a character or leave a dangling style. Shared geometry SHALL distinguish narrow text-presentation pictographs from double-width emoji using Unicode width and presentation properties consistent with the pinned renderer, rather than treating an entire pictograph block as wide. Padding, column slicing, overlays, and selection SHALL use the same cell boundaries.

#### Scenario: Measure wide and combining text
- **WHEN** text contains wide characters, combining marks, or zero-width joiners
- **THEN** its measured width SHALL equal the columns the terminal occupies

#### Scenario: Truncate styled text
- **WHEN** styled text is truncated to a width
- **THEN** the result SHALL occupy at most that width, SHALL NOT split a character, and SHALL NOT leave an unterminated style

#### Scenario: Distinguish text pictographs from emoji presentation
- **WHEN** a row contains bare `🖼` or its explicit emoji-presentation sequence
- **THEN** shared geometry SHALL count the bare symbol as one cell and the emoji-presentation sequence as two cells
- **AND** repeated occurrences SHALL retain those per-symbol widths without cumulative padding or overlay drift

#### Scenario: Compose a rail after narrow pictographs
- **WHEN** an overflowing viewport row contains one or more narrow text-presentation pictographs
- **THEN** its padding and rail SHALL end in the same declared terminal columns as an equivalent ASCII row
- **AND** selection and copy SHALL retain the original content using the corrected display-column boundaries
