## ADDED Requirements

### Requirement: Spinner-backed progress text has one canonical marker
The component layer SHALL provide one presentation rule for text rendered beside an animated progress spinner. It SHALL render exactly three ASCII periods (`...`) as the progress marker, SHALL replace a terminal Unicode ellipsis (`…`) or any terminal run of ASCII periods rather than duplicating it, and SHALL apply the same rule regardless of which built-in or extension producer supplied the semantic message. Producers SHALL NOT need to add or choose progress punctuation.

#### Scenario: Present semantic progress text
- **WHEN** a spinner-backed progress component receives `Working`
- **THEN** its visible message SHALL be `Working...`

#### Scenario: Normalize an existing marker
- **WHEN** the component receives `Compacting…`, `Retrying.`, or `Indexing......`
- **THEN** the visible message SHALL end in exactly `Compacting...`, `Retrying...`, or `Indexing...` respectively
- **AND** it SHALL contain neither a Unicode ellipsis nor a duplicated progress marker

#### Scenario: Re-render an already normalized message
- **WHEN** the component receives a message already ending in exactly three ASCII periods
- **THEN** the rendered text SHALL remain unchanged

#### Scenario: Render text without a spinner
- **WHEN** a notice, diagnostic, result, or ordinary status line is rendered without a progress spinner
- **THEN** the progress-marker rule SHALL NOT alter its text
