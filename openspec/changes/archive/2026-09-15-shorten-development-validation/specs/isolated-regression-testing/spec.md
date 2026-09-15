## MODIFIED Requirements

### Requirement: Development startup validation uses one required Windows runtime lane
For non-draft pull requests into `develop` that are neither documentation-only nor version-only, Development validation SHALL select first-attempt exact-package startup according to the complete trusted impact selection. A selected startup scope SHALL run exactly one Windows Node 22 startup lane and SHALL NOT schedule a Windows Node 24 PR startup lane. Manual invocation of Development validation SHALL use the same startup runtime selection and SHALL run the retained development scopes conservatively when no trusted change comparison exists. This is a validation-cadence decision, not removal of Node 24 runtime support or of tests from their retained scopes.

The retained Node 22 startup scope SHALL preserve first-attempt exact-package startup checks, enabled Defender real-time protection, unchanged performance limits, isolation, assertions, failure semantics, and evidence artifacts. Image preparation, packaged image workers, and durable-history compatibility SHALL remain Node 22 impact-selectable PR scopes independent of startup timing. Package identity, layer reuse, cleanup backlog, and updater cancellation/loss scenarios SHALL retain explicit exact-package owners instead of running solely because startup timing was selected. Changed tests and support SHALL select all affected owners even without production changes. Full-regression and nightly/release compositions SHALL retain all extracted scenarios on their existing applicable platforms and runtimes.

Documentation-only and version-only exemptions and draft behavior SHALL remain unchanged. This change SHALL not introduce a reduced startup smoke test in place of the complete selected startup contract or weaken the required aggregate.

#### Scenario: Applicable code PR is validated
- **WHEN** a ready code/operational PR has classified startup impact
- **THEN** exactly one Windows startup lane SHALL run on Node 22
- **AND** no Node 24 startup job SHALL be queued or required for that PR
- **AND** all retained startup assertions SHALL execute without semantic retries or ignored failures

#### Scenario: Exempt or draft PR is evaluated
- **WHEN** a PR is documentation-only, version-only, or draft
- **THEN** the existing applicable validation and startup-skip behavior SHALL be preserved rather than starting either startup lane unnecessarily

#### Scenario: Development validation is manually dispatched
- **WHEN** the maintainer invokes Development validation for a non-exempt source without a trusted impact comparison
- **THEN** the startup portion SHALL run on Windows Node 22 only and all retained development compatibility scopes SHALL run
- **AND** full Windows Node 24 validation SHALL remain available through the separate Full regression workflow

#### Scenario: Startup is proven unrelated
- **WHEN** complete trusted classification proves a ready PR does not affect startup and no startup test, supporting input, or invalidator changed
- **THEN** the Node 22 startup job SHALL be explicitly unselected
- **AND** mandatory fast partitions and every other selected integration scope SHALL still gate the PR

#### Scenario: Image or history compatibility changes
- **WHEN** an image/history implementation, packaged worker, test, or shared dependency changes
- **THEN** all affected Node 22 compatibility owners SHALL execute independently of whether startup timing is selected
- **AND** any transitive startup impact SHALL still select startup validation

#### Scenario: Cleanup scenarios move out of the startup suite
- **WHEN** package cleanup or recovery scenarios receive separate suite ownership
- **THEN** their existing exact-package assertions, representative backlog sizes, failure cases, and full-validation platform/runtime coverage SHALL remain intact
- **AND** changes to those tests or their dependencies SHALL require their PR execution

### Requirement: Required PR validation remains fail closed after runtime deferral
The required development aggregate SHALL depend on successful current-head Node 22 startup validation whenever the authoritative impact selection requires it, without waiting for a Node 24 PR startup result. It SHALL also require every selected image/history, exact-package, and containment scope. A failed, cancelled, missing, or unexpectedly skipped required result SHALL NOT be accepted as successful validation. An unselected startup result SHALL be accepted only with a complete trustworthy current-head selection explicitly proving it unnecessary; missing or invalid selection SHALL require conservative execution or block the aggregate. Nightly or earlier-head results SHALL NOT substitute for current-head PR checks. The named protected-branch aggregate and every other selected or mandatory gate SHALL remain in force.

#### Scenario: Required Node 22 startup succeeds
- **WHEN** current-head Node 22 startup and every other selected required PR gate succeed
- **THEN** the aggregate SHALL be able to succeed without any Node 24 PR startup result

#### Scenario: Retained startup coverage does not succeed
- **WHEN** a PR's selected Node 22 startup job fails, is cancelled, is missing, or is unexpectedly skipped
- **THEN** the required aggregate SHALL reject the result and integration SHALL remain blocked

#### Scenario: Previous or nightly startup evidence is green
- **WHEN** the current PR head lacks successful selected validation but an earlier head or nightly run passed
- **THEN** that other evidence SHALL NOT satisfy the PR's required aggregate

#### Scenario: A startup skip lacks authority
- **WHEN** a startup job is skipped without a valid current-head selection explicitly excluding it
- **THEN** the aggregate SHALL fail rather than infer irrelevance from the skip

#### Scenario: Selected compatibility coverage fails
- **WHEN** startup passes but a required extracted package, image/history, or containment scope fails
- **THEN** the aggregate SHALL remain unsuccessful

## ADDED Requirements

### Requirement: Faster package fixtures preserve cold-state and oracle independence
Fixture optimizations SHALL preserve fresh installation boundaries, exact package identity, representative workload sizes, independent comparison processes, hermetic mutable state, and verified owned-process cleanup. Immutable source templates or downloaded bytes SHALL be reusable only where their reuse does not supply the behavior under test or pre-warm a measured first-attempt launch. Every mutable instance, prefix, endpoint, release state, and cancellation lifecycle SHALL remain scenario-owned. Failed setup, assertions, command execution, or cleanup SHALL remain visible under the retained failure semantics rather than becoming a timing success.

#### Scenario: Repeated command fixtures share preparation
- **WHEN** equivalent command tests reuse an immutable repository template
- **THEN** each mutating scenario SHALL receive separate writable state and the same independent command assertions
- **AND** subsequent scenarios SHALL not observe prior refs, files, processes, or captured output

#### Scenario: A first-attempt startup fixture is prepared
- **WHEN** the exact candidate startup fixture is created using cached dependency downloads
- **THEN** it SHALL still use a fresh installation and preserve the existing declared certification and warmup sequence
- **AND** no additional warm launch, restored launch compile cache, or reused certified fixture SHALL precede its first measured attempt

#### Scenario: An independent parity oracle is expensive
- **WHEN** profiling identifies repeated pinned-versus-owned command processes as a cost
- **THEN** optimization SHALL retain independent oracle execution and strict output assertions rather than substituting owned output, recorded passing output, or shared mutable oracle state

#### Scenario: A large cleanup backlog dominates setup
- **WHEN** a production-shaped historical backlog is expensive to construct
- **THEN** optimization SHALL retain the existing release and payload counts and ownership/failure cases
- **AND** smaller workloads SHALL not be reported as equivalent acceptance evidence

#### Scenario: A failure would otherwise be hidden by cleanup
- **WHEN** a fixture command or assertion fails and teardown also encounters a problem
- **THEN** evidence SHALL retain the primary failure and separately identify cleanup outcome without reporting the fixture as passed
