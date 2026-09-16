## MODIFIED Requirements

### Requirement: Versioned delivery publication boundaries are explicit
Repository governance SHALL classify a supported version-3 OpenSpec association as one implementation-bound development PR from planning through finalized archive. It SHALL never publish, arm, or merge a dedicated acceptance or archive follow-up for that delivery. Existing requirements governing generated acceptance and archive PRs SHALL remain applicable only to version-1 and version-2 deliveries and already-published legacy work. Ordinary standalone documentation SHALL retain its existing exact-path automatic integration route.

#### Scenario: Draft delivery is opened
- **WHEN** an agent creates a new implementation-bound draft PR
- **THEN** the body SHALL start with `> Phase: Proposal`, followed by `Proposal` containing one or two intent sentences and a concrete `Implementation` section
- **AND** machine linkage SHALL remain last under `Automation` in an explained collapsed disclosure without routine validation-command boilerplate

#### Scenario: Finalized delivery is still under test
- **WHEN** a finalized version-3 body has phase `Implementation`
- **THEN** its proposal, implementation, acceptance, automation, archive, and manifest structure SHALL remain mechanically valid
- **AND** candidate validation SHALL allow the stable protected aggregate to succeed only after ordinary exact-head validation passes
- **AND** no later Acceptance phase SHALL be required before authorized manual merge

#### Scenario: Final delivery body is validated
- **WHEN** version-3 candidate validation evaluates a completed implementation PR
- **THEN** its first nonblank line SHALL be exactly `> Phase: Implementation`
- **AND** one each of `Proposal`, `Implementation`, `Acceptance`, and `Automation` SHALL appear in that order
- **AND** `Proposal` SHALL contain only one or two sentences of visible intent

#### Scenario: Finalized version-3 diff is documentation-shaped
- **WHEN** a version-3 implementation PR's final diff contains synchronized specs and a dated archive but its authoritative lifecycle association remains implementation-bound
- **THEN** documentation automation SHALL keep auto-merge disabled
- **AND** SHALL require authorized human manual merge

#### Scenario: Version-3 implementation merges
- **WHEN** a supported version-3 development PR merges
- **THEN** archive reconciliation SHALL verify the integrated archive without creating acceptance-only or archive-only pull requests

#### Scenario: Standalone documentation passes
- **WHEN** an unrelated non-draft documentation PR satisfies the existing exact allowlist and has no implementation-bound association
- **THEN** its existing CI-gated automatic integration route SHALL remain available

#### Scenario: Legacy archive remains pending
- **WHEN** a version-1 or version-2 delivery has a valid pending acceptance or archive PR
- **THEN** trusted legacy reconciliation SHALL continue under its existing rules
- **AND** SHALL NOT migrate it implicitly to the version-3 route
