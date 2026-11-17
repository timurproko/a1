## ADDED Requirements

### Requirement: Transcript row content cannot reposition the scrollbar

Bare A1 SHALL resolve owned transcript rows using consistent visible-cell and grapheme geometry across measurement, clipping, padding, selection, and styled spans. Styling inside a grapheme cluster and invisible Unicode format characters SHALL NOT change the column assigned to subsequent chrome. Raw content controls SHALL NOT execute terminal cursor movement, row erasure, or mode changes; tabs SHALL have deterministic space presentation before row paint. Safe presentation SHALL preserve semantic source text, truthful selection and copy mappings, supported styles and hyperlinks, and authorized image payloads.

#### Scenario: Paint invisible Unicode beside ordinary text

- **WHEN** a visible transcript row contains a Unicode word joiner or another non-advancing supported format character
- **THEN** padding and chrome composition SHALL use its actual supported cell advance
- **AND** the row SHALL NOT move the exposed scrollbar left or right

#### Scenario: Paint a grapheme interrupted by styling

- **WHEN** ANSI styling interrupts the code points of one visible grapheme
- **THEN** clipping, padding, selection, and span composition SHALL agree about that grapheme's complete visible bounds
- **AND** the row SHALL NOT overflow or lose the rail because separate style fragments were counted as separate cells

#### Scenario: Present raw controls in transcript content

- **WHEN** tool, assistant, steering, or extension content contains a raw tab, carriage return, backspace, embedded line break, or cursor-changing escape
- **THEN** owned row presentation SHALL normalize or safely suppress its terminal-control behavior before painting
- **AND** it SHALL NOT move content or rail paint into another row, the dock, or another column

### Requirement: Physical scrollbar placement is independent of content cursor advance

Bare A1 SHALL present current exposed scrollbar track and thumb cells at the frame's declared physical gutter column independently of the terminal cursor advance caused by preceding content. Rail painting SHALL occur within the current synchronized frame transaction, preserve the terminal cursor and current resolved row background, and respect covering modal surfaces. Full, cached, and differential presentations SHALL clear obsolete rail cells when visibility or geometry changes. The owned placement mechanism SHALL NOT change unassociated pinned comparison-profile writes or replay one-shot image transport.

#### Scenario: Render content whose widths disagree

- **WHEN** content measurement differs between a row helper and the supported terminal presentation path
- **THEN** the current exposed rail SHALL still occupy only its declared physical column and rows
- **AND** overflow containment SHALL NOT silently remove the rail from the presented frame

#### Scenario: Replace and scroll content repeatedly

- **WHEN** streaming, steering changes, selection, follow-tail scrolling, or cached updates replace rows beside the rail
- **THEN** all current exposed track and thumb cells SHALL remain aligned in the gutter
- **AND** no earlier misplaced rail cell SHALL survive the resulting frame

#### Scenario: Change terminal or dock geometry

- **WHEN** width, height, dock allocation, rail appearance, or a covering modal changes
- **THEN** physical rail painting SHALL use the new exposed transcript bounds and appearance
- **AND** obsolete rail cells SHALL be restored to current content without drawing in the dock or above a covering modal

#### Scenario: Preserve gutter styling and interaction

- **WHEN** a row background, text selection, hyperlink, or image is adjacent to the scrollbar
- **THEN** the gutter SHALL retain its resolved background while the rail uses its own decoration
- **AND** rail cells SHALL remain excluded from semantic selection and copied source text
- **AND** cursor restoration, hyperlink boundaries, and one-shot image transport SHALL remain intact
