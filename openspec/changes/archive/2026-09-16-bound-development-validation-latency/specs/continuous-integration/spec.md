## MODIFIED Requirements

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, copies, deletions, rename sources, and rename destinations. Selection SHALL use a bounded, reviewed ownership registry that maps stable path groups, changed tests, shared support, explicit invalidators, and integration execution cadence to logical scopes and platform/runtime targets. The ownership result SHALL be understandable from path and policy records without requiring successful whole-repository source parsing. Dependency reachability MAY add scope reasons but SHALL NOT be the sole authority for a known coarse owner.

Every changed pull-request-eligible retained test SHALL select its owning scope, including tests outside the PR core. A changed exhaustive-only test SHALL be recorded as deferred from ordinary PR execution and SHALL select its focused deterministic contract coverage rather than its exhaustive owner. Changes to shared test support SHALL select all declared affected pull-request owners and SHALL record affected exhaustive owners for Full/nightly execution. Unknown ownership, unavailable history, malformed policy, or classifier failure SHALL select complete applicable pull-request coverage or block rather than produce an empty selection. Typechecking, architecture, applicable naming/documentation governance, validation-policy integrity, directly changed pull-request tests, and the declared smoke contracts SHALL remain mandatory in the PR core. Manual Development validation without a complete trusted change comparison SHALL run all retained pull-request scopes; Full regression and nightly/release coverage SHALL remain complete and SHALL not be reduced by PR impact selection.

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

## ADDED Requirements

### Requirement: Integration owners declare pull-request or exhaustive cadence
Every retained integration owner SHALL declare exactly one execution cadence: `pull-request` or `exhaustive`. Ordinary `pull_request` and manual Development validation SHALL schedule only pull-request owners. Impact selection SHALL choose affected pull-request owners, while conservative selection SHALL choose all pull-request owners. Exhaustive owners SHALL remain mandatory in manual Full regression and scheduled nightly/stable release validation and SHALL never satisfy, replace, or be inferred from focused PR coverage.

A malformed, missing, or unknown cadence declaration SHALL block selection rather than default an exhaustive owner into or out of PR validation. Selection evidence SHALL list selected pull-request owners and deferred exhaustive owners separately. The protected aggregate SHALL require every selected PR owner and SHALL neither wait for nor accept evidence from a cadence-deferred owner.

#### Scenario: Validation-authority pull request is conservative
- **WHEN** a pull request changes Development workflow or selector authority
- **THEN** trusted classification SHALL select every pull-request owner and record every exhaustive owner as cadence-deferred
- **AND** the protected aggregate SHALL complete without scheduling an exhaustive owner

#### Scenario: Ordinary release implementation changes
- **WHEN** a pull request changes package or update production code
- **THEN** affected pull-request package, update, startup, and deterministic predecessor contracts SHALL run
- **AND** the real multi-release predecessor owner SHALL remain deferred to Full/nightly validation

#### Scenario: Full regression is requested
- **WHEN** a maintainer dispatches Full regression
- **THEN** all pull-request and exhaustive owners SHALL execute with their retained assertions and targets

#### Scenario: Nightly or stable validation runs
- **WHEN** nightly or stable release validation expands complete coverage
- **THEN** all exhaustive owners SHALL execute against the selected exact package
- **AND** a failed exhaustive owner SHALL block that workflow's publication authority

#### Scenario: Cadence policy is malformed
- **WHEN** an integration owner omits cadence or declares an unsupported value
- **THEN** selection and aggregation SHALL fail closed
- **AND** no omitted owner SHALL be interpreted as safely deferred

### Requirement: Pull-request latency targets are measured by owner and scope
Development validation SHALL report setup, per-scope invocation, selected-job execution, aggregate processing, and runner execution critical-path durations without counting pre-runner queue delay as test execution. Acceptance evidence for this change SHALL include representative owned-path and conservative validation runs. The ordinary PR target SHALL be no more than eight minutes of runner execution critical path and no more than five minutes for any individual PR-required scope invocation.

These targets SHALL be evaluated by removing or optimizing inappropriate work, not by increasing timeouts, shrinking representative workloads, caching mutable installed state, suppressing assertions, or retrying failures. Hosted variance MAY be reported, but an observation above either target SHALL remain an unmet result and SHALL not support a completed speedup claim.

#### Scenario: Conservative PR timing is inspected
- **WHEN** a validation-authority change selects complete pull-request coverage
- **THEN** evidence SHALL identify every owner and scope on the critical path with separate setup and invocation durations
- **AND** it SHALL report the eight-minute and five-minute targets as met or unmet

#### Scenario: Exhaustive work is deferred
- **WHEN** the published-predecessor owner is excluded from an ordinary PR by cadence
- **THEN** evidence SHALL identify cadence deferral rather than classify the owner as unrelated, skipped unexpectedly, or passed

#### Scenario: A PR-required scope exceeds its target
- **WHEN** an individual selected PR scope takes more than five minutes or the runner execution critical path exceeds eight minutes
- **THEN** acceptance evidence SHALL report the target as unmet
- **AND** validation SHALL retain the original assertions, timeout, first-attempt outcome, and failure visibility
