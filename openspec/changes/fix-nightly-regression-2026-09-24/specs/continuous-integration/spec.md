## MODIFIED Requirements

### Requirement: Pull-request validation waits for a reviewable candidate
Development validation SHALL schedule no test suite while a pull request is draft. When an ordinary pull request becomes ready for review, one readiness decision SHALL permit its existing impact-selected validation. When a version-3 implementation-bound pull request becomes ready while its OpenSpec change is still active, base-controlled policy SHALL defer test selection until trusted finalization has updated the pull-request metadata with the archive and acceptance-manifest paths. The finalized exact head SHALL then receive every existing selected validation scope and the stable protected aggregate.

The readiness decision SHALL execute without pull-request-head code or dependency installation, SHALL report an explicit reason, and SHALL fail closed for malformed lifecycle metadata. For pull-request events, readiness SHALL read current mutable body and draft metadata through trusted read-only GitHub authority and SHALL use it only when the current pull-request head still equals the event head. A superseded event head SHALL defer, and unavailable or invalid current metadata SHALL fail visibly. Draft and pre-finalization runs SHALL NOT emit a misleading successful `Development validation required` aggregate. The absence of that exact-head aggregate SHALL keep the candidate ineligible for integration. Conversion back to draft and later ready-head changes SHALL continue to cancel superseded PR validation; no prior-head result SHALL be reused.

Manual Development dispatch, scheduled/manual Full regression, release validation, publication gates, OpenSpec finalization, and post-merge verification SHALL retain their independent triggers and authority. Once readiness permits Development validation, owner selection, native lanes, assertions, coverage, retries, timeouts, permissions, evidence binding, and failure semantics SHALL remain unchanged.

#### Scenario: Draft implementation receives pushes
- **WHEN** any draft pull request receives planning, implementation, body, or head changes
- **THEN** Development validation SHALL schedule no test suite or protected aggregate
- **AND** the draft SHALL gain no acceptance or integration authority

#### Scenario: Ordinary pull request becomes ready
- **WHEN** a pull request without an active version-3 implementation association becomes ready for review
- **THEN** its existing impact-selected Development validation SHALL start
- **AND** the successful current-head protected aggregate SHALL remain required for integration

#### Scenario: Version-3 implementation becomes ready
- **WHEN** a version-3 implementation pull request becomes ready while its metadata still identifies an active change without finalized delivery paths
- **THEN** Development validation SHALL report that finalization is pending without scheduling test suites
- **AND** no `Development validation required` aggregate SHALL certify that pre-finalization head

#### Scenario: Finalization publishes the candidate
- **WHEN** trusted finalization pushes the finalized version-3 head and records both emitted paths in the implementation metadata
- **THEN** the existing pull-request event SHALL start Development validation for that exact head
- **AND** every selected job and protected aggregate SHALL retain its prior requirements

#### Scenario: Finalization events arrive out of order
- **WHEN** a same-head pull-request event carries pre-finalization body metadata after trusted finalization has recorded the finalized paths on the current pull request
- **THEN** readiness SHALL classify the current body bound to that unchanged event head
- **AND** event ordering SHALL NOT leave the finalized candidate deferred without selected validation

#### Scenario: Ready work is superseded
- **WHEN** a ready pull request receives another head or body change or is converted back to draft
- **THEN** stale in-progress Development validation MAY be cancelled
- **AND** only an eligible latest ready head MAY produce merge-authorizing evidence

#### Scenario: Lifecycle metadata is malformed
- **WHEN** a ready pull request contains malformed or contradictory implementation metadata
- **THEN** base-controlled readiness SHALL fail visibly without executing pull-request test suites
- **AND** the protected aggregate SHALL remain unavailable rather than treating the candidate as ordinary or finalized

#### Scenario: Current readiness metadata is unavailable
- **WHEN** trusted readiness cannot read valid current pull-request metadata for the event head
- **THEN** readiness SHALL fail visibly without executing pull-request test suites
- **AND** the protected aggregate SHALL remain unavailable rather than trusting stale event metadata
