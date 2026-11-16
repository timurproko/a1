## ADDED Requirements

### Requirement: Development publication follow-up output has one shared boundary

Whenever development-publication observation finishes or stops, the observer SHALL leave exactly one blank line between the last visible job-status row and subsequent output. A header with no visible job rows SHALL retain its existing single blank separator without adding another. The same contract SHALL apply to successful and unsuccessful workflow conclusions, interruption, unavailable or malformed run/job status, and local waiting failures. Interactive redraws and append-only fallbacks SHALL leave the cursor at the left margin below the progress region, without overwriting prior output or leaking job-row indentation into subsequent messages.

Stopped-watching output SHALL place its reason heading, unknown-remote-outcome and retry guidance, and full-log URL on separate left-aligned lines. An observation failure SHALL NOT imply remote cancellation or a known publication outcome. Successful workflow output SHALL remain distinct from subsequent registry verification, whose failures SHALL remain nonzero and left-aligned.

#### Scenario: Observation stops while a job is running
- **WHEN** a signal, unavailable or malformed GitHub response, or waiting failure stops observation after a running status row
- **THEN** exactly one blank line SHALL precede the stopped-watching heading
- **AND** its reason heading, unknown-outcome guidance, and full-log link SHALL occupy separate lines starting at the left margin

#### Scenario: A workflow completes
- **WHEN** an observed workflow finishes with success, failure, cancellation, timeout, or another unsuccessful conclusion
- **THEN** exactly one blank line SHALL precede the appropriate left-aligned workflow summary or failure heading
- **AND** the remote conclusion, diagnostic bounds, and command exit semantics SHALL remain unchanged

#### Scenario: No visible job rows were observed
- **WHEN** observation completes or stops before any job qualifies for display
- **THEN** the publication header's existing blank separator SHALL be reused without an extra blank line

#### Scenario: Live rows or terminal fallbacks precede follow-up output
- **WHEN** observation exits after an earlier job row was redrawn or after resize, narrow, unknown-dimension, short-terminal, dumb-terminal, or nonterminal fallback
- **THEN** the following output SHALL remain below the last visible status row with one blank separator and left-margin alignment

#### Scenario: Registry verification fails after workflow success
- **WHEN** an observed workflow succeeds but subsequent exact-package or public-tag verification fails
- **THEN** the left-aligned workflow summary SHALL follow the shared progress separator
- **AND** the subsequent left-aligned error SHALL preserve the registry failure without claiming publication succeeded

## MODIFIED Requirements

### Requirement: Publication failure summaries use log-first bullet details

The local publication failure description SHALL retain its plain heading without a colored dot, place an unindented full-log link immediately beneath that heading, and follow a blank separator with asterisk bullets whose markers start at the left margin for every detail. The existing development command SHALL retain its develop heading prefix. Job identities, concrete diagnostics or missing-evidence notices, downstream consequences, npm staging state, and retry guidance SHALL retain their meanings and existing diagnostic bounds. Development progress and the completed failure footer SHALL be separated by exactly one blank line through the shared observer-exit boundary. Interrupted or unavailable observation SHALL retain an unindented log link without implying a completed publication outcome.

#### Scenario: A completed publication fails
- **WHEN** a completed development publication has a failed producer or validation job
- **THEN** its failure footer SHALL show the develop-prefixed plain heading, unindented full-log link, blank line, and left-margin asterisk details
- **AND** footer text SHALL remain neutral without changing the failed command outcome or publication state

#### Scenario: Failure evidence is missing or several jobs fail
- **WHEN** a completed failure has unavailable diagnostics, several failed jobs, or downstream gate failures
- **THEN** every emitted detail SHALL use the same left-margin asterisk marker while retaining existing evidence limits and truthfulness

#### Scenario: Status observation is interrupted
- **WHEN** local waiting is interrupted or authoritative GitHub status cannot be read
- **THEN** the unknown-outcome message SHALL retain its full-log link at the left edge without claiming that the remote publication stopped
