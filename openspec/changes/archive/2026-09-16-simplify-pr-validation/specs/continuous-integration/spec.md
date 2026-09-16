## MODIFIED Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no product build or product test execution, but SHALL run every lightweight governance consistency check whose scanned inputs they change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests into `develop` SHALL require a bounded PR core consisting of typechecking, architecture and applicable governance checks, directly changed tests, reviewed path-owned test scopes, and a small current-product smoke set. They SHALL select additional rendering, startup, package, compatibility, and platform evidence only when coarse reviewed ownership marks it affected. Unknown operational inputs and changes to validation authority SHALL select complete development validation. Preview publication SHALL additionally require the complete fast tier and exact-package gates on every supported platform. Stable publication SHALL require the complete automated suite on every supported platform. The scheduled nightly workflow SHALL run one full tracked-repository documentation review and complete retained automated coverage against its authoritative `origin/develop` source before publication can succeed.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL avoid product builds and tests, run strict OpenSpec validation when applicable, and run docs-sensitive governance consistency checks

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes classified non-documentation paths without changing validation authority or an unknown operational input
- **THEN** validation SHALL run the bounded PR core and every additional scope selected by reviewed ownership
- **AND** it SHALL NOT require unrelated retained tests merely because they belong to the complete fast tier
- **AND** the required aggregate check SHALL gate the merge

#### Scenario: Validation authority or unknown input changes
- **WHEN** a pull request changes workflow selection, ownership, suite composition, aggregation authority, common build policy, or an operational path with no trustworthy owner
- **THEN** validation SHALL run complete applicable development coverage or block
- **AND** no selective result SHALL be inferred from the untrusted policy

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the complete fast tier and exact packed-candidate gates on Windows, Linux, and macOS without requiring every stable-only scope

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

#### Scenario: Scheduled nightly source is selected
- **WHEN** the nightly publication workflow resolves the authoritative `origin/develop` commit
- **THEN** one platform-independent job SHALL inspect documentation governance across every tracked policy-relevant file at that exact commit
- **AND** the retained platform validation matrix SHALL execute complete coverage without repeating the same documentation review

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, copies, deletions, rename sources, and rename destinations. Selection SHALL use a bounded, reviewed ownership registry that maps stable path groups, changed tests, shared support, and explicit invalidators to logical scopes and platform/runtime targets. The ownership result SHALL be understandable from path and policy records without requiring successful whole-repository source parsing. Dependency reachability MAY add scope reasons but SHALL NOT be the sole authority for a known coarse owner.

Every changed retained test SHALL select its owning scope, including tests outside the PR core. Changes to shared test support SHALL select all declared affected owners. Unknown ownership, unavailable history, malformed policy, or classifier failure SHALL select complete applicable development coverage or block rather than produce an empty selection. Typechecking, architecture, applicable naming/documentation governance, validation-policy integrity, directly changed tests, and the declared smoke contracts SHALL remain mandatory in the PR core. Manual Development validation without a complete trusted change comparison SHALL run all retained development scopes; Full regression and nightly/release coverage SHALL remain complete and SHALL not be reduced by PR impact selection.

#### Scenario: Changed source is transitively rendered
- **WHEN** a changed operational path belongs to the reviewed UI/rendering owner or a declared shared input affects rendering
- **THEN** the classifier SHALL select the applicable rendering scope and target
- **AND** it SHALL record the owner and changed paths as bounded reasons

#### Scenario: Unrelated foundation changes
- **WHEN** the complete change contains no path, test, shared support, or invalidator owned by rendering or another integration scope
- **THEN** each unrelated integration scope SHALL be explicitly unselected
- **AND** the mandatory PR core SHALL still run

#### Scenario: Reachable dependency is deleted or renamed
- **WHEN** a base or head path participating in reviewed ownership is deleted, copied, or renamed
- **THEN** classification SHALL account for both source and destination identities
- **AND** moving a path SHALL not evade its applicable owners

#### Scenario: A transitive launch dependency changes
- **WHEN** a changed path belongs to the broad reviewed launch/startup group or declared shared support used by packaged launch
- **THEN** startup and every other declared affected integration owner SHALL be selected with bounded ownership reasons

#### Scenario: Only unrelated governance tooling changes
- **WHEN** every changed operational path belongs to reviewed governance tooling outside product integration and no validation invalidator changes
- **THEN** unrelated startup, package, rendering, compatibility, and platform scopes SHALL be explicitly unselected
- **AND** applicable PR-core governance checks SHALL remain required

#### Scenario: Integration tests or shared fixtures change
- **WHEN** a retained integration test or its declared shared support changes without production changes
- **THEN** all declared owners of that test or support SHALL execute in current-head PR validation
- **AND** unknown test ownership SHALL select complete applicable coverage or block

#### Scenario: Validation selection infrastructure changes
- **WHEN** workflow selection, ownership, suite composition, aggregation, package dependencies, or common build configuration changes
- **THEN** classification SHALL select every retained development scope whose execution or interpretation may be affected
- **AND** a selector or ownership-policy change SHALL require complete retained development coverage

#### Scenario: Classification cannot prove safety
- **WHEN** the authoritative head, complete diff, registry, or required changed path cannot be established or interpreted
- **THEN** development validation SHALL run complete applicable coverage or block
- **AND** the reason SHALL be visible in machine-readable and human-readable evidence

#### Scenario: Manual development validation has no trusted comparison
- **WHEN** Development validation is manually dispatched without a complete authoritative change comparison
- **THEN** every retained development scope SHALL run rather than treating an empty diff as proof of no impact

### Requirement: Independent development partitions do not serialize feedback
Development validation SHALL schedule the mandatory PR core and each selected integration partition independently after its actual prerequisites. Resource-sensitive files selected by ownership SHALL remain non-file-parallel on an isolated runner, with the same authoritative membership and unchanged timeout semantics used by complete validation. No selected test SHALL be duplicated between partitions on the same platform/runtime merely because job boundaries changed. Cross-platform and cross-runtime executions SHALL remain distinct evidence where selected.

The single protected-branch aggregate SHALL require the PR core and every scope selected for the current head and selection identity. It SHALL reject missing, failed, cancelled, stale, malformed, or unexpectedly skipped selected results. A skipped integration scope SHALL be acceptable only when the current trustworthy selection explicitly excludes it. Independent jobs SHALL not share mutable application state or owned process trees.

#### Scenario: Fast work and resume checks are selected
- **WHEN** a code PR requires the PR core, a resource-sensitive owner, and package resume integration
- **THEN** the resource-sensitive and resume jobs SHALL not depend on completion of unrelated core tests solely for sequencing
- **AND** all selected results SHALL be required before the aggregate succeeds

#### Scenario: Serialization would be replaced by contention
- **WHEN** a resource-sensitive partition is selected alongside ordinary validation
- **THEN** it SHALL execute on an isolated runner rather than concurrently on the ordinary runner
- **AND** it SHALL retain one-file-at-a-time execution and all existing assertions and timeouts

#### Scenario: A selected partition is skipped
- **WHEN** the current selection requires a core or integration partition but that partition is missing, cancelled, or skipped
- **THEN** the aggregate SHALL fail even if every completed partition passed

#### Scenario: Evidence belongs to another selection
- **WHEN** a result belongs to another head, workflow run, or selection identity
- **THEN** it SHALL NOT satisfy the current aggregate

#### Scenario: Finalized Implementation candidate completes validation
- **WHEN** a finalized implementation-bound pull request in the Implementation phase runs ordinary exact-head validation
- **THEN** selected product validation and finalized-delivery validation SHALL both execute for that candidate
- **AND** the stable protected aggregate SHALL succeed in the same workflow run only after every selected result and the finalized delivery record succeed
- **AND** no Acceptance phase edit or second workflow run SHALL be required before manual review and merge

#### Scenario: Manual review rejects the implementation
- **WHEN** manual review finds a defect after the protected aggregate succeeds
- **THEN** the pull request SHALL remain open in Implementation while fixes are pushed
- **AND** the changed exact head SHALL run normal validation again before merge

#### Scenario: Complete validation is requested
- **WHEN** conservative PR classification, Full regression, nightly, preview, or stable validation requests complete retained coverage
- **THEN** every retained fast and applicable integration owner SHALL execute under its declared isolation and platform/runtime contract

## ADDED Requirements

### Requirement: Same-head failed-job reruns reuse only authoritative successes
Development validation SHALL support GitHub's failed-jobs-only rerun for an unchanged workflow run, head, and selection. A successful selected job from an earlier attempt of that same run MAY satisfy the rerun aggregate when that job was not rerun, while every job executed in the current attempt SHALL use its current-attempt result. Evidence names SHALL remain distinct across attempts. A different head, run, workflow selection, or changed ownership identity SHALL invalidate reuse. Semantic test failures SHALL never be retried automatically or converted to success, and every failed attempt SHALL remain visible.

#### Scenario: One job has an infrastructure failure
- **WHEN** one selected job fails for an infrastructure reason while other selected jobs pass and the maintainer requests failed-jobs-only rerun without changing the head
- **THEN** only the failed job and its dependent aggregate MAY execute again
- **AND** the aggregate SHALL accept unchanged exact-head successes from earlier attempts of that run after the rerun succeeds

#### Scenario: A rerun job fails again
- **WHEN** a selected job executes in the current attempt and remains unsuccessful
- **THEN** its older success or another run SHALL NOT override the current-attempt failure
- **AND** the aggregate SHALL fail

#### Scenario: The pull-request head or selection changes
- **WHEN** a new commit, workflow authority, owner registry, or selection identity differs from the recorded success
- **THEN** prior-attempt evidence SHALL NOT satisfy the new validation
- **AND** every scope selected for the new identity SHALL run again

#### Scenario: A semantic assertion fails
- **WHEN** a test reports a product or policy assertion failure
- **THEN** validation SHALL retain the failure without automatically rerunning the test
- **AND** a maintainer-requested same-head rerun SHALL remain distinguishable from first-attempt success

### Requirement: Ordinary validation evidence is proportionate to its authority
Checkout-bound type, architecture, governance, unit, and smoke jobs SHALL bind their outcome to the authoritative head, run, selection, and logical scope without reproducing package-level content receipts. Exact build, candidate, installation, and digest receipts SHALL remain mandatory where a gate consumes emitted or packed artifacts or supplies publication authority. The aggregate SHALL rely on trusted Actions job conclusions plus only the additional evidence needed to establish selected scope identity and exact-artifact contracts.

#### Scenario: Checkout-bound unit job completes
- **WHEN** a PR-core job reads only the checked-out source and produces no artifact consumed as a publication candidate
- **THEN** its result SHALL be bound to the current head and selected scope without hashing the complete build or package surface

#### Scenario: Exact package is consumed
- **WHEN** startup, package, update, compatibility, preview, or release validation consumes emitted or packed candidate bytes
- **THEN** compatible build and package identity SHALL be verified before those bytes satisfy the gate
- **AND** ordinary checkout-bound success SHALL NOT substitute for exact-package evidence

#### Scenario: Aggregate evidence is unavailable or contradictory
- **WHEN** trusted job status, scope identity, or required exact-artifact evidence is missing, stale, ambiguous, or contradictory
- **THEN** the required aggregate SHALL fail rather than infer success
