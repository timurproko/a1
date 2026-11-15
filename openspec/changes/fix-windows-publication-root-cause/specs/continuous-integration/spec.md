## ADDED Requirements

### Requirement: Read-only published-pair reproduction

Development validation SHALL provide an explicitly selected diagnostic route that exercises an existing immutable application and installer version on hosted Windows without publishing packages or changing public npm tags. It SHALL capture bounded sanitized detached recovery-worker errors and exit information without changing the installed predecessor's package bytes. Diagnostic success SHALL NOT substitute for finalized-candidate validation or authorize promotion.

#### Scenario: A published recovery worker exits without a result

- **WHEN** an explicitly requested existing-version reproduction loses its recovery worker before result publication
- **THEN** the diagnostic artifact SHALL retain available worker stderr, uncaught errors, and exit status alongside the primary smoke failure

#### Scenario: Normal development validation is requested

- **WHEN** no published-pair diagnostic version is supplied
- **THEN** ordinary validation routing SHALL remain unchanged and no registry reproduction SHALL run

#### Scenario: Diagnostic reproduction fails

- **WHEN** a read-only published-pair reproduction fails
- **THEN** neither package publishing nor public-tag promotion SHALL occur and failure evidence SHALL still be uploaded
