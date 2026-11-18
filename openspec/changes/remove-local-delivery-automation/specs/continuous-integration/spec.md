## MODIFIED Requirements

### Requirement: Final implementation validation remains attached to the pull request

Validation that authorizes handoff or integration of a finalized version-3 implementation SHALL execute from a native pull-request event for the exact finalized head. Its selected lanes, queued/running/completed state, failures, and stable `Development validation required` aggregate SHALL be associated with and visible from that pull request's checks UI.

Development validation SHALL defer an implementation candidate whose finalized-head body binding is absent or differs from the event head. A later ordinary pull-request event with a matching binding SHALL perform the applicable impact-selected product, governance, and aggregate checks. Development validation SHALL NOT itself validate the delivery record; the shared delivery workflow's check owns that decision. Earlier-head, branch-only, manually dispatched, `workflow_run`, or synthetic commit-status evidence SHALL NOT substitute for that PR-associated run.

#### Scenario: Final head enters ordinary validation
- **WHEN** a pull-request event identifies a finalized version-3 head whose body binding matches that exact head
- **THEN** Development validation SHALL run the applicable PR-context checks
- **AND** GitHub SHALL show their progress and final aggregate on the pull request

#### Scenario: Pre-finalization run is superseded
- **WHEN** finalization moves the pull request from an implementation head to a new finalized head
- **THEN** validation for the earlier head SHALL NOT authorize merge
- **AND** the finalized head SHALL receive a distinct PR-associated run before the required aggregate can pass

#### Scenario: Finalized-head binding is stale
- **WHEN** a pull-request event's head differs from the version-3 finalized-head binding in its body
- **THEN** Development validation SHALL defer product suites and SHALL emit no successful protected aggregate
- **AND** trusted finalization SHALL remain responsible for publishing the matching binding and event

#### Scenario: Manual dispatch targets the same branch
- **WHEN** a maintainer manually dispatches Development validation against a finalized implementation branch
- **THEN** the run MAY provide diagnostic coverage in Actions
- **AND** SHALL NOT replace the PR-associated selection, visibility, or aggregate evidence required for integration

### Requirement: Release reopening pull requests integrate after validation
The post-publication next-development pull request SHALL remain subject to required
validation and SHALL integrate automatically through the release-reopening auto-merge
manager once its exact current head passes required validation. The release command SHALL NOT create a pre-publication release-note or
stable-version pull request, enable auto-merge itself, directly merge the reopening PR,
relax branch protection, or treat CI success on any head other than the current one as
permission to advance. It SHALL display the draft Release and reopening PR URLs with
phase-specific steps and verify the reopening PR's actual merge before reporting
completion. A reopening PR that fails verification SHALL fall back to manual merge.

Reopening preparation SHALL preserve the caller's checkout, staged/unstaged work,
and unrelated worktrees. Version edits SHALL affect only this package's manifest and
root lockfile version fields, not dependency versions, and the only additional file
SHALL be the exact approved `docs/releases/<released-version>.md`. Pending or failed
work SHALL remain identifiable without destructive resets or silent replacement of a
conflicting draft, branch, or PR. Reusing an existing reopening PR SHALL accept only no
armed auto-merge or squash auto-merge armed by the trusted manager.

#### Scenario: Prepare the stable version PR
- **WHEN** the command prepares stable `0.1.8` from `0.1.8-dev`
- **THEN** it SHALL present the draft GitHub Release for editing and SHALL create no stable-version or release-note pull request

#### Scenario: Prepare the reopening PR
- **WHEN** stable `0.1.8` is published successfully
- **THEN** the command SHALL present one PR containing `0.1.9-dev` version changes and the exact approved `docs/releases/0.1.8.md`
- **AND** that PR SHALL integrate without maintainer merge action once its current head passes required validation

#### Scenario: A version PR is not merged
- **WHEN** the reopening PR is closed without merging, cannot be verified, or remains pending beyond the bounded wait
- **THEN** the command SHALL report its identity and incomplete state without merging it itself or claiming that development reopened

#### Scenario: Local work appears while a release waits
- **WHEN** the caller's checkout changes while release orchestration is awaiting publication or the reopening PR
- **THEN** those changes SHALL be preserved and any unsafe local synchronization SHALL be declined with authoritative remote state reported

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, copies, deletions, rename sources, and rename destinations. Selection SHALL use a bounded, reviewed ownership registry that maps stable path groups, changed tests, shared support, explicit invalidators, and integration execution cadence to logical scopes and platform/runtime targets. The ownership result SHALL be understandable from path and policy records without requiring successful whole-repository source parsing. Dependency reachability MAY add scope reasons but SHALL NOT be the sole authority for a known coarse owner.

Every changed pull-request-eligible retained test SHALL select its owning scope, including tests outside the PR core. A changed exhaustive-only test SHALL be recorded as deferred from ordinary PR execution and SHALL select its focused deterministic contract coverage rather than its exhaustive owner. Changes to shared test support SHALL select the pull-request owners of every retained test that reaches the changed path through the test tree's static import graph, and SHALL record affected exhaustive owners for Full/nightly execution; when no retained test reaches the path (including support consumed only from outside the test tree) or the graph cannot be built, the change SHALL select every owner the shared rule declares and SHALL record that fallback. Reachability SHALL only narrow a shared rule's declared owner set and SHALL never remove an owner selected by its own path or changed-test rules. Unknown ownership, unavailable history, malformed policy, or classifier failure SHALL select complete applicable pull-request coverage or block rather than produce an empty selection. Typechecking, architecture, applicable naming/documentation governance, validation-policy integrity, directly changed pull-request tests, and the declared smoke contracts SHALL remain mandatory in the PR core. Manual Development validation without a complete trusted change comparison SHALL run all retained pull-request scopes; Full regression and nightly/release coverage SHALL remain complete and SHALL not be reduced by PR impact selection. An implementation-bound lifecycle association SHALL disable the documentation-only and version-only exemptions so the PR core always runs, and SHALL NOT by itself select conservative ownership; the associated pull request's unit and integration owners SHALL still be chosen by impact from its complete change.

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
- **THEN** the pull-request owners of that test, and of every retained test that imports the changed support directly or through other support files, SHALL execute in current-head PR validation with the reaching tests recorded as the reason
- **AND** affected exhaustive-only owners SHALL be recorded as deferred rather than silently omitted
- **AND** unknown test ownership SHALL select complete applicable pull-request coverage or block

#### Scenario: Shared support has no known importer
- **WHEN** a changed path under a shared-support rule is reached by no retained test, including one consumed only from outside the test tree, or the import graph cannot be built
- **THEN** classification SHALL select every owner the shared rule declares
- **AND** the selection SHALL record the declared fallback as the reason

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
- **WHEN** a pull request that links an OpenSpec change has a complete diff touching only documentation, OpenSpec, or archive paths
- **THEN** selection SHALL classify it from that diff exactly as it would an unlinked pull request
- **AND** the link in the pull-request body SHALL NOT change the selected scopes

#### Scenario: Implementation-bound diff touches owned source
- **WHEN** a pull request that links an OpenSpec change changes a path with a reviewed coarse owner
- **THEN** selection SHALL choose that owner's tests and the integration owners its ownership links
- **AND** unrelated pull-request owners SHALL remain explicitly unselected

### Requirement: Independent development partitions do not serialize feedback
Development validation SHALL schedule the mandatory PR core and each selected integration partition independently after its actual prerequisites. Resource-sensitive files selected by ownership SHALL remain non-file-parallel on an isolated runner, with the same authoritative membership and the same explicit hang bound used by complete validation. No selected test SHALL be duplicated between partitions on the same platform/runtime merely because job boundaries changed. Cross-platform and cross-runtime executions SHALL remain distinct evidence where selected.

The single protected-branch aggregate SHALL require the PR core and every scope selected for the current head and selection identity. It SHALL reject missing, failed, cancelled, stale, malformed, or unexpectedly skipped selected results. A skipped integration scope SHALL be acceptable only when the current trustworthy selection explicitly excludes it. Independent jobs SHALL not share mutable application state or owned process trees. The modular job matrix SHALL be derived from the trusted selection by one reviewed repository script that declares every Development modular job; an entry the selection leaves inactive SHALL NOT be scheduled, each scheduled job SHALL still resolve its own owners from the uploaded selection, and the aggregate SHALL still require successful evidence for every selected owner.

#### Scenario: Fast work and resume checks are selected
- **WHEN** a code PR requires the PR core, a resource-sensitive owner, and package resume integration
- **THEN** the resource-sensitive and resume jobs SHALL not depend on completion of unrelated core tests solely for sequencing
- **AND** all selected results SHALL be required before the aggregate succeeds

#### Scenario: Serialization would be replaced by contention
- **WHEN** a resource-sensitive partition is selected alongside ordinary validation
- **THEN** it SHALL execute on an isolated runner rather than concurrently on the ordinary runner
- **AND** it SHALL retain one-file-at-a-time execution and all existing assertions under the partition's explicit hang bound

#### Scenario: A selected partition is skipped
- **WHEN** the current selection requires a core or integration partition but that partition is missing, cancelled, or skipped
- **THEN** the aggregate SHALL fail even if every completed partition passed

#### Scenario: Evidence belongs to another selection
- **WHEN** a result belongs to another head, workflow run, or selection identity
- **THEN** it SHALL NOT satisfy the current aggregate

#### Scenario: Finalized Implementation candidate completes validation
- **WHEN** a finalized pull request that links an OpenSpec change runs ordinary exact-head validation
- **THEN** selected product validation SHALL execute for that candidate
- **AND** the stable protected aggregate SHALL succeed in the same workflow run only after every selected result succeeds
- **AND** no further body edit or second workflow run SHALL be required before manual review and merge

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

### Requirement: Pull-request validation waits for a reviewable candidate
Development validation SHALL schedule no test suite while a pull request is draft. When an ordinary pull request becomes ready for review, one readiness decision SHALL permit its existing impact-selected validation. When a pull request that links an OpenSpec change becomes ready while that change is still active, base-controlled policy SHALL defer test selection until the shared delivery workflow has recorded the archive path and the finalized head in the pull-request body. Readiness SHALL read only that record; association and delivery validity SHALL remain the shared delivery check's decision. The finalized exact head SHALL then receive every existing selected validation scope and the stable protected aggregate.

The readiness decision SHALL execute without pull-request-head code or dependency installation, SHALL report an explicit reason, and SHALL fail closed for malformed lifecycle metadata. For pull-request events, readiness SHALL read current mutable body and draft metadata through trusted read-only GitHub authority and SHALL use it only when the current pull-request number, head, and base still equal the immutable event identity. Drifted, unavailable, or invalid current metadata SHALL fail visibly. Draft and pre-finalization runs SHALL NOT emit a misleading successful `Development validation required` aggregate. The absence of that exact-head aggregate SHALL keep the candidate ineligible for integration. Conversion back to draft and later ready-head changes SHALL continue to cancel superseded PR validation; no prior-head result SHALL be reused.

Manual Development dispatch, scheduled/manual Full regression, release validation, publication gates, and the shared delivery workflow SHALL retain their independent triggers and authority. Once readiness permits Development validation, owner selection, native lanes, assertions, coverage, retries, timeouts, permissions, evidence binding, and failure semantics SHALL remain unchanged.

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

## REMOVED Requirements

### Requirement: Documentation-only changes merge on their own
**Reason**: Documentation pull requests follow the same delivery path as every other change, so one workflow covers all pull requests.

**Migration**: A maintainer merges a documentation pull request, or arms auto-merge on it.
