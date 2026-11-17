## MODIFIED Requirements

### Requirement: Publication failure summaries use log-first bullet details

The local publication failure description SHALL retain its plain heading without a colored dot, place an unindented full-log link immediately beneath that heading, and follow a blank separator with asterisk bullets whose markers use the same two-space indentation as job-status dots for every detail. The existing development command SHALL retain its develop heading prefix. Job identities, concrete diagnostics or missing-evidence notices, downstream consequences, npm staging state, and retry guidance SHALL retain their meanings and existing diagnostic bounds. Development progress and the completed failure footer SHALL be separated by exactly one blank line through the shared observer-exit boundary. Interrupted or unavailable observation SHALL retain an unindented log link without implying a completed publication outcome.

#### Scenario: A completed publication fails
- **WHEN** a completed development publication has a failed producer or validation job
- **THEN** its failure footer SHALL show the develop-prefixed plain heading, unindented full-log link, blank line, and asterisk details aligned with job-status dots
- **AND** footer text SHALL remain neutral without changing the failed command outcome or publication state

#### Scenario: Failure evidence is missing or several jobs fail
- **WHEN** a completed failure has unavailable diagnostics, several failed jobs, or downstream gate failures
- **THEN** every emitted detail SHALL use the same two-space-indented asterisk marker while retaining existing evidence limits and truthfulness

#### Scenario: Alternate publication callers and terminal modes
- **WHEN** a shared failure description is printed by a development or stable publication caller in an interactive or append-only terminal
- **THEN** all asterisk markers SHALL retain two leading spaces while headings and full-log links remain unindented

#### Scenario: Status observation is interrupted
- **WHEN** local waiting is interrupted or authoritative GitHub status cannot be read
- **THEN** the unknown-outcome message SHALL retain its full-log link at the left edge without claiming that the remote publication stopped

## ADDED Requirements

### Requirement: Packaged resume readiness failures retain sanitized crash evidence

When a packaged resume process exits before input readiness, the validation fixture SHALL retain available bounded sanitized fatal diagnostics before deleting its disposable runtime. Retained fatal evidence SHALL contain only allowlisted failure classifications and owned source locations, not raw error messages, absolute crash paths, settings, credentials, or conversation content. Missing or unreadable diagnostic files SHALL NOT replace the original readiness failure or make it pass.

#### Scenario: Early launch exception
- **WHEN** a packaged resume exits before readiness and writes a valid fatal record
- **THEN** validation SHALL retain the sanitized failure origin, classification, cleanup outcome, and owned code locations before fixture cleanup
- **AND** the readiness assertion SHALL remain failed

#### Scenario: Unavailable or malformed crash evidence
- **WHEN** a failing packaged launch has absent, unreadable, oversized, or malformed fatal records
- **THEN** validation SHALL preserve its original readiness failure without exposing raw record contents
