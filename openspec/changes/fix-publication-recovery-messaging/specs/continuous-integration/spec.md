## ADDED Requirements

### Requirement: Development publication reports compact actionable status

The local development-publication command SHALL identify the selected version and Actions log URL, report meaningful job or phase state changes without dumping every job's setup and teardown steps, and avoid repeating unchanged polling snapshots. A failed publication SHALL exit nonzero and provide a bounded deduplicated summary prioritizing concrete primary failures over known derivative aggregate failures. Full diagnostics SHALL remain accessible through the log URL. Presentation SHALL NOT weaken required validation or publication checks.

#### Scenario: Publication is progressing
- **WHEN** the command observes a running development publication
- **THEN** it SHALL report changed meaningful job or phase states without repeated full job/step listings
- **AND** the selected version and full Actions log URL SHALL remain available

#### Scenario: Platform validation blocks publication
- **WHEN** a platform validation failure causes downstream publication aggregates to fail and npm staging is skipped
- **THEN** the summary SHALL identify the failing platform and its concrete recorded reasons before downstream consequences
- **AND** it SHALL state that publication was blocked and direct the maintainer to the full log and a fix before retrying

#### Scenario: Failure evidence is unavailable
- **WHEN** a completed failed run has unavailable or generic-only annotations
- **THEN** the command SHALL retain the known failed job or stage identity, state that detailed failure evidence is unavailable, and provide the log URL

#### Scenario: Watching stops before a known final outcome
- **WHEN** watching is interrupted or an authoritative status read becomes unavailable
- **THEN** the command SHALL distinguish observation failure from publication failure and SHALL NOT claim that the remote run stopped, succeeded, or published nothing

#### Scenario: Publication fails after npm staging may have started
- **WHEN** a failed publication has evidence of a started or completed npm staging job
- **THEN** the summary SHALL NOT claim that no package was published and SHALL identify the known stage state for inspection
