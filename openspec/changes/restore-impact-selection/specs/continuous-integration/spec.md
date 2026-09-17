## MODIFIED Requirements

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, copies, deletions, rename sources, and rename destinations. Selection SHALL use a bounded, reviewed ownership registry that maps stable path groups, changed tests, shared support, explicit invalidators, and integration execution cadence to logical scopes and platform/runtime targets. The ownership result SHALL be understandable from path and policy records without requiring successful whole-repository source parsing. Dependency reachability MAY add scope reasons but SHALL NOT be the sole authority for a known coarse owner.

Every changed pull-request-eligible retained test SHALL select its owning scope, including tests outside the PR core. A changed exhaustive-only test SHALL be recorded as deferred from ordinary PR execution and SHALL select its focused deterministic contract coverage rather than its exhaustive owner. Changes to shared test support SHALL select all declared affected pull-request owners and SHALL record affected exhaustive owners for Full/nightly execution. Unknown ownership, unavailable history, malformed policy, or classifier failure SHALL select complete applicable pull-request coverage or block rather than produce an empty selection. Typechecking, architecture, applicable naming/documentation governance, validation-policy integrity, directly changed pull-request tests, and the declared smoke contracts SHALL remain mandatory in the PR core. Manual Development validation without a complete trusted change comparison SHALL run all retained pull-request scopes; Full regression and nightly/release coverage SHALL remain complete and SHALL not be reduced by PR impact selection. An implementation-bound lifecycle association SHALL disable the documentation-only and version-only exemptions so the PR core always runs, and SHALL NOT by itself select conservative ownership; the associated pull request's unit and integration owners SHALL still be chosen by impact from its complete change.

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
- **THEN** startup and every other declared affected pull-request integration owner SHALL be selected with bounded ownership reasons

#### Scenario: Only unrelated governance tooling changes
- **WHEN** every changed operational path belongs to reviewed governance tooling outside product integration and no validation invalidator changes
- **THEN** unrelated startup, package, rendering, compatibility, and platform scopes SHALL be explicitly unselected
- **AND** applicable PR-core governance checks SHALL remain required

#### Scenario: Integration tests or shared fixtures change
- **WHEN** a retained pull-request integration test or its declared shared support changes without production changes
- **THEN** all declared pull-request owners of that test or support SHALL execute in current-head PR validation
- **AND** affected exhaustive-only owners SHALL be recorded as deferred rather than silently omitted
- **AND** unknown test ownership SHALL select complete applicable pull-request coverage or block

#### Scenario: Exhaustive predecessor test changes
- **WHEN** the real multi-release predecessor test or its exhaustive-only support changes
- **THEN** ordinary PR validation SHALL run the focused deterministic predecessor contracts and record the exhaustive owner as deferred
- **AND** Full regression and nightly/release SHALL continue to execute the changed exhaustive test

#### Scenario: Validation selection infrastructure changes
- **WHEN** workflow selection, ownership, suite composition, aggregation, package dependencies, or common build configuration changes
- **THEN** classification SHALL select every retained pull-request scope whose execution or interpretation may be affected
- **AND** a selector or ownership-policy change SHALL require complete retained pull-request coverage
- **AND** exhaustive-only owners SHALL remain required by their Full/nightly cadence rather than becoming ordinary PR work

#### Scenario: Classification cannot prove safety
- **WHEN** the authoritative head, complete diff, registry, or required changed path cannot be established or interpreted
- **THEN** development validation SHALL run complete applicable pull-request coverage or block
- **AND** the reason and every cadence-deferred owner SHALL be visible in machine-readable and human-readable evidence

#### Scenario: Manual development validation has no trusted comparison
- **WHEN** Development validation is manually dispatched without a complete authoritative change comparison
- **THEN** every retained pull-request scope SHALL run rather than treating an empty diff as proof of no impact
- **AND** the maintainer SHALL use Full regression when exhaustive validation is required

#### Scenario: Implementation-bound diff is documentation-shaped
- **WHEN** an implementation-bound pull request's complete diff touches only documentation, OpenSpec, or archive paths
- **THEN** the PR core SHALL run without the documentation-only exemption
- **AND** ownership selection SHALL remain `impact` with no integration owner selected merely because of the association

#### Scenario: Implementation-bound diff touches owned source
- **WHEN** an implementation-bound pull request changes a path with a reviewed coarse owner
- **THEN** selection SHALL choose that owner's tests and the integration owners its ownership links
- **AND** unrelated pull-request owners SHALL remain explicitly unselected

### Requirement: Independent development partitions do not serialize feedback
Development validation SHALL schedule the mandatory PR core and each selected integration partition independently after its actual prerequisites. Resource-sensitive files selected by ownership SHALL remain non-file-parallel on an isolated runner, with the same authoritative membership and unchanged timeout semantics used by complete validation. No selected test SHALL be duplicated between partitions on the same platform/runtime merely because job boundaries changed. Cross-platform and cross-runtime executions SHALL remain distinct evidence where selected.

The single protected-branch aggregate SHALL require the PR core and every scope selected for the current head and selection identity. It SHALL reject missing, failed, cancelled, stale, malformed, or unexpectedly skipped selected results. A skipped integration scope SHALL be acceptable only when the current trustworthy selection explicitly excludes it. Independent jobs SHALL not share mutable application state or owned process trees. The modular job matrix SHALL be derived from the trusted selection by one reviewed repository script that declares every Development modular job; an entry the selection leaves inactive SHALL NOT be scheduled, each scheduled job SHALL still resolve its own owners from the uploaded selection, and the aggregate SHALL still require successful evidence for every selected owner.

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

#### Scenario: Inactive matrix entries are not scheduled
- **WHEN** the trusted selection activates only some declared modular jobs
- **THEN** the workflow SHALL schedule only the active entries and record the unscheduled ones in the run summary
- **AND** the aggregate SHALL fail when an active entry produced no successful evidence
