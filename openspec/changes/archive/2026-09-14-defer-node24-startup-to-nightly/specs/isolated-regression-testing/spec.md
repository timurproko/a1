## ADDED Requirements

### Requirement: Development startup validation uses one required Windows runtime lane
For non-draft pull requests into `develop` that are neither documentation-only nor version-only, Development validation SHALL run the complete Windows Node 22 startup lane and SHALL NOT schedule a Windows Node 24 startup lane. Manual invocation of Development validation SHALL use the same startup runtime selection. This is a validation-cadence decision, not removal of Node 24 runtime support or of tests from their retained scopes.

The retained Node 22 lane SHALL preserve first-attempt exact-package startup checks, enabled Defender real-time protection, image preparation and packaged-worker coverage, durable-history coverage, and evidence artifacts. Performance limits, isolation, assertions, and failure semantics SHALL remain unchanged. Documentation-only and version-only startup exemptions, draft behavior, and all other required PR gates SHALL remain unchanged.

#### Scenario: Applicable code PR is validated
- **WHEN** a ready code/operational PR receives Development validation
- **THEN** exactly one Windows startup lane SHALL run on Node 22
- **AND** no Node 24 startup job SHALL be queued or required for that PR
- **AND** all existing Node 22 startup-job checks SHALL execute without semantic retries or ignored failures

#### Scenario: Exempt or draft PR is evaluated
- **WHEN** a PR is documentation-only, version-only, or draft
- **THEN** the existing applicable validation and startup-skip behavior SHALL be preserved rather than starting either startup lane unnecessarily

#### Scenario: Development validation is manually dispatched
- **WHEN** the maintainer invokes Development validation for a non-exempt source
- **THEN** the startup portion SHALL run on Windows Node 22 only
- **AND** full Windows Node 24 validation SHALL remain available through the separate Full regression workflow

### Requirement: Required PR validation remains fail closed after runtime deferral
The required development aggregate SHALL depend on successful current-head Node 22 startup validation for applicable PRs, without waiting for a Node 24 PR startup result. A failed, cancelled, missing, or unexpectedly skipped required startup result SHALL NOT be accepted as successful validation. Nightly or earlier-head results SHALL NOT substitute for current-head PR checks. The named protected-branch aggregate and every other required gate SHALL remain in force.

#### Scenario: Required Node 22 startup succeeds
- **WHEN** current-head Node 22 startup and every other selected required PR gate succeed
- **THEN** the aggregate SHALL be able to succeed without any Node 24 PR startup result

#### Scenario: Retained startup coverage does not succeed
- **WHEN** an applicable PR's Node 22 startup job fails, is cancelled, is missing, or is unexpectedly skipped
- **THEN** the required aggregate SHALL reject the result and integration SHALL remain blocked

#### Scenario: Previous or nightly startup evidence is green
- **WHEN** the current PR head lacks successful required validation but an earlier head or nightly run passed
- **THEN** that other evidence SHALL NOT satisfy the PR's required aggregate

### Requirement: Deferred Windows Node 24 coverage remains mandatory outside ordinary PR validation
The existing scheduled nightly/release validation pipeline SHALL retain Windows Node 24 and Node 22, including first-attempt exact-package startup coverage with Defender enabled and unchanged budget, artifact-identity, and publication-gating rules. Manual Full regression SHALL retain both Windows runtimes and the complete existing non-physical suite. The tests currently run in the Node 24 PR startup job SHALL remain covered through the existing full-validation owners; this change SHALL NOT delete or weaken startup, image, history, or packaged-worker tests.

No additional release may be published on the strength of the reduced PR matrix alone when the publication's own required validation is incomplete or failing. The existing nightly schedule, supported-platform matrix, release modes, and permission boundaries SHALL remain unchanged.

#### Scenario: Scheduled nightly validation runs
- **WHEN** the existing nightly pipeline validates its selected exact package
- **THEN** Windows Node 24 and Node 22 SHALL retain their required validation with the original assertions and startup limits
- **AND** failure of either required lane SHALL block its publication under the existing policy

#### Scenario: Maintainer requests full validation before nightly
- **WHEN** the Full regression workflow is manually dispatched
- **THEN** it SHALL retain both Windows runtimes and the current complete non-physical validation, including the deferred Node 24 coverage

#### Scenario: Cadence change is accepted
- **WHEN** the reduced PR startup matrix is delivered for acceptance
- **THEN** evidence SHALL identify a current-head PR run with only Node 22 startup, its successful aggregate, and retained Node 24 full-validation run evidence
- **AND** workflow policy tests SHALL guard both the reduced PR selection and the preserved full-validation coverage
- **AND** the handoff SHALL disclose that Node-24-specific regressions may be detected only after integration rather than claiming equivalent pre-merge runtime coverage
