## MODIFIED Requirements

### Requirement: Spinner-backed progress text has one canonical marker
The component layer SHALL provide one presentation rule for text rendered beside an animated progress spinner on an A1-owned surface. It SHALL render exactly one Unicode ellipsis (`…`) as the terminal progress marker, SHALL replace an existing terminal Unicode ellipsis or terminal run of ASCII periods rather than duplicating it, and SHALL apply the same rule regardless of which built-in or extension producer supplied the semantic message. Producers SHALL NOT need to add or choose progress punctuation.

The semantic label before the ellipsis SHALL use a restrained animation in which a compact accent-coloured highlight moves across otherwise muted text. The highlight SHALL use the same theme accent role as the spinner, SHALL advance more slowly than the spinner by deriving its phase from existing spinner updates, and SHALL include a pause between passes. The ellipsis SHALL remain muted and stationary. Every phase SHALL have identical plain text, display width, and grapheme content; animation SHALL NOT add a timer, alter spinner cadence, move characters, cycle punctuation, or introduce a literal terminal colour.

#### Scenario: Present semantic progress text
- **WHEN** a spinner-backed A1 progress component receives `Working`
- **THEN** its visible plain-text message SHALL be `Working…`

#### Scenario: Normalize an existing marker
- **WHEN** the component receives `Compacting…`, `Retrying.`, or `Indexing......`
- **THEN** the visible plain-text message SHALL end in exactly `Compacting…`, `Retrying…`, or `Indexing…` respectively
- **AND** it SHALL contain neither a terminal run of ASCII periods nor a duplicated progress marker

#### Scenario: Re-render an already normalized message
- **WHEN** the component receives a message already ending in one Unicode ellipsis
- **THEN** the rendered plain text SHALL remain unchanged

#### Scenario: Animate a progress label
- **WHEN** successive spinner updates render a spinner-backed A1 progress label
- **THEN** a compact highlight using the spinner's accent role SHALL move across the semantic label at a slower cadence and pause between passes
- **AND** stripping terminal styling from every phase SHALL produce the same label and one Unicode ellipsis at the same display width

#### Scenario: Render an extension label with grapheme clusters
- **WHEN** an extension progress label contains a wide character, combining sequence, or emoji
- **THEN** each animation phase SHALL style only complete grapheme clusters
- **AND** the visible text and width SHALL remain unchanged

#### Scenario: Render text without a spinner
- **WHEN** a notice, diagnostic, result, ordinary status line, or pinned comparison status is rendered without the A1 progress presentation
- **THEN** the progress-marker and animated-highlight rules SHALL NOT alter its text or styling
