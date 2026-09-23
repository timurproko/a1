## ADDED Requirements

### Requirement: Pull-request validation waits for a reviewable candidate
Development validation SHALL schedule no test suite while a pull request is draft. When an ordinary pull request becomes ready for review, one readiness decision SHALL permit its existing impact-selected validation. When a version-3 implementation-bound pull request becomes ready while its OpenSpec change is still active, base-controlled policy SHALL defer test selection until trusted finalization has updated the pull-request metadata with the archive and acceptance-manifest paths. The finalized exact head SHALL then receive every existing selected validation scope and the stable protected aggregate.

The readiness decision SHALL execute without pull-request-head code or dependency installation, SHALL report an explicit reason, and SHALL fail closed for malformed lifecycle metadata. Draft and pre-finalization runs SHALL NOT emit a misleading successful `Development validation required` aggregate. The absence of that exact-head aggregate SHALL keep the candidate ineligible for integration. Conversion back to draft and later ready-head changes SHALL continue to cancel superseded PR validation; no prior-head result SHALL be reused.

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

#### Scenario: Ready work is superseded
- **WHEN** a ready pull request receives another head or body change or is converted back to draft
- **THEN** stale in-progress Development validation MAY be cancelled
- **AND** only an eligible latest ready head MAY produce merge-authorizing evidence

#### Scenario: Lifecycle metadata is malformed
- **WHEN** a ready pull request contains malformed or contradictory implementation metadata
- **THEN** base-controlled readiness SHALL fail visibly without executing pull-request test suites
- **AND** the protected aggregate SHALL remain unavailable rather than treating the candidate as ordinary or finalized

## MODIFIED Requirements

### Requirement: Repair and publishing pull requests select visible complete regression
Development validation SHALL select PR-attached Full regression only for a nightly-repair pull request that the trusted regression-triage automation created from a failed Full regression. Selection SHALL use base-controlled policy, immutable configured GitHub App author identity, generated source-run provenance, complete changed and renamed-from paths, current PR metadata, and supported lifecycle association. A matching branch, title, OpenSpec identifier, body text, changed release/publishing path, unknown operational path, or label SHALL NOT select complete regression without that generated provenance. Release/publishing, build/prerequisite, shared-support, and validation-authority impact SHALL use ordinary Development selection and SHALL NOT independently select PR-attached Full regression. No PR label SHALL opt into or opt out of the complete suite.

Selection SHALL record the exact head, target baseline, input identity, decision, and reasons. Invalid PR identity, contradictory lifecycle data, or stale recorded selection SHALL block validation. Missing or invalid generated-repair provenance SHALL not grant complete-regression selection; ordinary validation SHALL still fail closed under its existing impact and lifecycle policy rather than treating the missing full suite as successful evidence.

Generated repair drafts SHALL not launch complete regression, including after they acquire implementation changes. A ready generated repair SHALL wait for version-3 finalization and then expose complete-regression checks on the finalized exact head. Head, lifecycle, provenance, and readiness changes SHALL trigger fresh evaluation. Human-authored and other automation-authored PRs SHALL retain ordinary bounded validation regardless of matching names or changed paths.

#### Scenario: Repair remains draft while code is developed
- **WHEN** an App-created failed-Full-regression repair draft acquires approved executable implementation changes with valid provenance
- **THEN** its full-regression selector and native lanes SHALL remain unscheduled
- **AND** the PR SHALL remain draft and ineligible for integration

#### Scenario: Planning scaffold is proposed
- **WHEN** trusted triage creates a draft containing only planning artifacts and failed-run provenance
- **THEN** it SHALL retain lightweight planning behavior without scheduling exhaustive jobs

#### Scenario: Ready repair is finalized
- **WHEN** an eligible generated failed-regression repair is marked ready and trusted finalization publishes its finalized head
- **THEN** that exact finalized head SHALL expose the selected complete-regression checks
- **AND** all native lanes SHALL remain required through the protected aggregate

#### Scenario: Publishing preparation changes
- **WHEN** a human-authored PR changes a release build prerequisite, packaging input, publication workflow, or validation policy
- **THEN** ordinary impact-selected or conservative Development validation SHALL run after the PR becomes ready
- **AND** PR-attached Full regression SHALL remain unselected

#### Scenario: Human creates a lookalike repair
- **WHEN** a human creates a matching `fix/nightly-regression-*` branch, OpenSpec association, title, body, or provenance-shaped file
- **THEN** immutable author and generated-origin checks SHALL keep PR-attached Full regression unselected

#### Scenario: App creates unrelated work
- **WHEN** the configured App authors a PR without valid failed-Full-regression source provenance
- **THEN** App identity alone SHALL NOT select complete regression

#### Scenario: Maintainer applies the former opt-in label
- **WHEN** `ci:full-regression` or another label is added to an ordinary PR
- **THEN** the label SHALL NOT trigger Development validation or alter complete-regression selection
- **AND** only a later qualifying generated failed-regression provenance change MAY select the suite

#### Scenario: A path or repair marker is moved
- **WHEN** trusted finalization moves the eligible repair's active OpenSpec path into its archive
- **THEN** author, source provenance, and renamed/history evidence SHALL preserve complete-regression selection on the final head

#### Scenario: Opt-in is removed
- **WHEN** `ci:full-regression` or another label is removed from any PR
- **THEN** removal SHALL NOT trigger Development validation or alter complete-regression selection
- **AND** current head, body, base, readiness, and provenance identity SHALL retain their existing freshness rules

#### Scenario: Source provenance is not a failed Full regression
- **WHEN** generated provenance identifies a successful or cancelled Full regression, a Release run, an unsupported event, or an unverifiable source
- **THEN** PR-attached Full regression SHALL remain unselected
- **AND** ordinary required validation and independent release/nightly gates SHALL retain their authority
