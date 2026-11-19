## ADDED Requirements

### Requirement: npm publication recovers boundedly from duplicate transparency-log entries

Trusted npm publication SHALL retry an exact validated package only when npm reports `TLOG_CREATE_ENTRY_ERROR` because an equivalent transparency-log entry already exists. Before another upload attempt, publication SHALL query the exact package version without cache. Exact expected integrity and shasum SHALL complete that package as an idempotent success, different registry bytes SHALL fail, and only an absent version SHALL permit retrying the same tarball with provenance.

The recovery SHALL preserve npm trusted publishing, provenance, public access, ignored lifecycle scripts, the public npm registry, installer-before-application ordering, and final pair verification. Attempts and delays SHALL be bounded. Retry exhaustion and every other npm failure SHALL remain publication failures.

#### Scenario: Duplicate transparency entry precedes registry publication

- **WHEN** npm trusted publishing returns `TLOG_CREATE_ENTRY_ERROR` for an equivalent entry and the exact package version remains absent
- **THEN** publication SHALL retry the same validated tarball with provenance after a bounded delay
- **AND** a successful retry SHALL continue the ordinary package-pair publication flow

#### Scenario: Registry accepted the package despite the failed command

- **WHEN** the recognized duplicate-entry failure is followed by npm serving the expected integrity and shasum
- **THEN** publication SHALL treat that package as complete without another upload

#### Scenario: Registry serves different bytes

- **WHEN** registry reconciliation finds the target package version with integrity or shasum different from the validated candidate
- **THEN** publication SHALL fail without retrying or publishing the other package

#### Scenario: An unrelated npm failure occurs

- **WHEN** npm publish fails without the exact duplicate transparency-log identity
- **THEN** publication SHALL preserve the failure without retry

#### Scenario: Duplicate-entry recovery is exhausted

- **WHEN** every bounded attempt returns the recognized duplicate transparency-log failure while the package remains absent
- **THEN** publication SHALL fail and final pair verification SHALL remain ineligible
