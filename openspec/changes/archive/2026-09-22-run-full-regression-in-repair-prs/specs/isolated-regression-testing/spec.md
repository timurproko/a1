## MODIFIED Requirements

### Requirement: Changed tests pass in pull-request validation
A retained or newly added pull-request-eligible test SHALL pass in the pull-request validation of continuous integration before its change is integrated. A changed exhaustive-only test SHALL receive focused deterministic contract validation in the ordinary PR scopes and SHALL remain mandatory in Full regression and nightly/release validation. If trusted PR policy selects complete regression, the exhaustive test SHALL additionally execute within that PR's full suite rather than being reported as wholly deferred. Otherwise it SHALL be recorded as cadence-deferred. Local execution is an optional debugging aid, not a completion gate.

#### Scenario: Pull-request validation passes
- **WHEN** continuous integration validates the pull request containing changed pull-request-eligible tests
- **THEN** every selected changed test SHALL pass before the change MAY be integrated
- **AND** no local suite execution SHALL be required

#### Scenario: Exhaustive-only test changes
- **WHEN** a PR changes an exhaustive test and trusted policy proves PR Full regression unselected
- **THEN** ordinary validation SHALL run its focused deterministic contract coverage and report the exhaustive test as cadence-deferred
- **AND** the exhaustive test SHALL remain required in Full regression and nightly/release validation without reduced assertions

#### Scenario: Exhaustive-only test changes with full selection
- **WHEN** release impact, repair association, or opt-in selects PR Full regression
- **THEN** the retained exhaustive test SHALL execute in the PR full suite with its original assertions and targets
- **AND** focused deterministic success SHALL not substitute for a failed exhaustive result

### Requirement: Development startup validation uses one required Windows runtime lane
For non-draft pull requests into `develop` that are neither documentation-only nor version-only, ordinary Development scopes SHALL select first-attempt exact-package startup according to the complete trusted impact selection. An ordinary selected startup scope SHALL run exactly one Windows Node 22 startup lane and SHALL NOT schedule an additional Node 24 lane in that bounded scope. Manual invocation of Development validation SHALL retain the same ordinary startup runtime selection and conservative retained development scopes when no trusted comparison exists. A separately selected PR Full regression SHALL additionally execute the complete suite, including Windows Node 22 and Node 24, through its shared complete-regression matrix. This explicit full-suite exception SHALL not change ordinary scope cadence or supported Node runtimes.

The retained Node 22 startup scope SHALL preserve first-attempt exact-package startup checks, enabled Defender real-time protection, unchanged performance limits, isolation, assertions, failure semantics, and evidence artifacts. Image preparation, packaged image workers, and durable-history compatibility SHALL remain Node 22 impact-selectable ordinary scopes independent of startup timing. Package identity, layer reuse, cleanup backlog, and updater cancellation/loss scenarios SHALL retain explicit exact-package owners. Changed tests and support SHALL select all affected owners even without production changes. Full-regression and nightly/release compositions SHALL retain all extracted scenarios on their existing applicable platforms and runtimes.

Ordinary documentation-only, version-only, and draft exemptions SHALL remain unchanged except for explicitly selected PR Full regression. Planning-only drafts SHALL stay lightweight; selected implementation drafts MAY run full validation without gaining integration authority. No reduced startup smoke test SHALL replace the complete selected startup contract or weaken the required aggregate.

#### Scenario: Applicable code PR is validated
- **WHEN** a ready PR has startup impact and trusted policy proves full regression unselected
- **THEN** exactly one Windows startup lane SHALL run on Node 22
- **AND** no Node 24 startup job SHALL be queued or required for that PR
- **AND** retained startup assertions SHALL execute without semantic retries or ignored failures

#### Scenario: Full regression is selected inside a PR
- **WHEN** a repair or publishing-impact PR requires complete regression
- **THEN** its full matrix SHALL retain both Windows runtimes and the complete startup contract
- **AND** ordinary Node 22 success SHALL not exempt the selected full Node 24 result

#### Scenario: Exempt or draft PR is evaluated
- **WHEN** an unselected docs-only or version-only PR, or a planning-only draft, is evaluated
- **THEN** existing lightweight behavior SHALL be preserved without starting startup lanes unnecessarily

#### Scenario: Development validation is manually dispatched
- **WHEN** the maintainer invokes ordinary Development validation for a non-exempt source without a trusted impact comparison
- **THEN** its startup portion SHALL run on Windows Node 22 only and retained development compatibility scopes SHALL run
- **AND** complete Windows Node 24 coverage SHALL remain available through Full regression

#### Scenario: Startup is proven unrelated
- **WHEN** complete trusted classification proves a ready PR does not affect startup, no supporting input or invalidator changed, and full regression is unselected
- **THEN** the ordinary Node 22 startup job SHALL be explicitly unselected
- **AND** mandatory fast partitions and every other selected integration scope SHALL still gate the PR

#### Scenario: Image or history compatibility changes
- **WHEN** an image/history implementation, packaged worker, test, or shared dependency changes
- **THEN** all affected Node 22 compatibility owners SHALL execute independently of whether ordinary startup timing is selected
- **AND** any transitive startup impact SHALL still select startup validation

#### Scenario: Cleanup scenarios move out of the startup suite
- **WHEN** package cleanup or recovery scenarios receive separate suite ownership
- **THEN** their existing exact-package assertions, representative backlog sizes, failure cases, and full-validation platform/runtime coverage SHALL remain intact
- **AND** changes to those tests or their dependencies SHALL require their PR execution

### Requirement: Required PR validation remains fail closed after runtime deferral
The required development aggregate SHALL depend on successful current-head Node 22 startup validation whenever authoritative ordinary impact selection requires it. It SHALL not wait for Node 24 evidence when trusted policy proves complete regression unselected. When PR Full regression is selected, the aggregate SHALL additionally require its complete matrix, including Windows Node 24. It SHALL also require every selected image/history, exact-package, containment, delivery, and governance scope. Failed, cancelled, missing, stale, or unexpectedly skipped required results SHALL NOT be accepted as successful validation. Unselected work SHALL be accepted only with complete trustworthy current-head selection explicitly proving it unnecessary; missing or invalid selection SHALL require conservative execution or block the aggregate. Nightly, independent dispatch, or earlier-head results SHALL NOT substitute for current PR checks. The named protected aggregate and all other mandatory gates SHALL remain in force.

#### Scenario: Required Node 22 startup succeeds
- **WHEN** Node 22 startup and every other required PR gate succeed and full regression is proven unselected
- **THEN** the aggregate MAY succeed without any Node 24 startup result

#### Scenario: Selected full runtime coverage fails
- **WHEN** ordinary Node 22 startup passes but a selected full Node 24 or other native lane does not succeed
- **THEN** the protected aggregate SHALL remain unsuccessful

#### Scenario: Retained startup coverage does not succeed
- **WHEN** selected Node 22 startup fails, is cancelled, is missing, or is unexpectedly skipped
- **THEN** the required aggregate SHALL reject the result and integration SHALL remain blocked

#### Scenario: Previous or nightly startup evidence is green
- **WHEN** the current PR lacks successful selected validation but an earlier head or independent workflow passed
- **THEN** that other evidence SHALL NOT satisfy the PR's required aggregate

#### Scenario: A startup skip lacks authority
- **WHEN** startup is skipped without a valid current-head selection explicitly excluding it
- **THEN** the aggregate SHALL fail rather than infer irrelevance from the skip

#### Scenario: Selected compatibility coverage fails
- **WHEN** startup passes but a required package, image/history, or containment scope fails
- **THEN** the aggregate SHALL remain unsuccessful

### Requirement: Published predecessor subprocess waits preserve runner responsiveness
Published-predecessor compatibility validation SHALL remain able to process runner messages, timers, and cancellation while waiting for package installation, registry lookup, or shipped setup subprocesses. Command waits SHALL NOT block the test worker's event loop. The real multi-release scenario SHALL retain existing test, hook, warmup, runner, and workflow time limits, predecessor selection and coverage, exact candidate bytes, command ordering, and the requirement to execute each selected predecessor's own release code.

The real multi-release scenario SHALL use exhaustive cadence: it SHALL run in manual, scheduled, and selected PR-attached Full regression and in nightly/stable release validation. It SHALL NOT be added to ordinary bounded Development scopes. Those scopes SHALL retain focused deterministic predecessor command, lifecycle, error, fixture, materialization, and warmup contracts, but SHALL NOT claim that those contracts exercised published predecessor code. Without full-regression selection the real scenario SHALL remain explicitly deferred; with full selection its complete result SHALL gate the PR. This exception SHALL not reduce its default predecessor count, supported-entry checks, exact-package authority, assertions, or failure semantics.

Subprocess results SHALL be bounded and fail closed. Validation SHALL not report success before the owned command and its captured output have closed successfully. Spawn failure, nonzero exit, signal termination, cancellation, output overflow, malformed required metadata, or failed setup SHALL prevent later dependent phases. Cleanup SHALL preserve unrelated state and processes and SHALL not remove a temporary installation while its owned subprocess is active.

#### Scenario: A package command remains in progress
- **WHEN** a predecessor-validation subprocess is still running
- **THEN** the test worker SHALL continue servicing control-plane events without waiting for that subprocess to exit
- **AND** the subprocess SHALL still be subject to the existing enclosing validation lifetime

#### Scenario: A prerequisite fails
- **WHEN** installation, registry lookup, or shipped setup fails or produces unusable required evidence
- **THEN** validation SHALL fail with bounded phase, version where known, elapsed-time, and error identity
- **AND** subsequent dependent import, materialization, and warmup steps SHALL NOT run
- **AND** diagnostic output SHALL NOT expose credentials, environment contents, or arbitrary captured subprocess output

#### Scenario: Output exceeds the supported bound
- **WHEN** a subprocess exceeds the retained capture limit
- **THEN** validation SHALL fail and clean up the owned command
- **AND** truncated output SHALL NOT be interpreted as successful or complete evidence

#### Scenario: Validation is cancelled during installation
- **WHEN** enclosing validation is cancelled or expires while an owned command is active
- **THEN** its lifetime SHALL end through ownership-safe cleanup before temporary installation removal
- **AND** unrelated processes and paths SHALL remain untouched

#### Scenario: Ordinary pull-request validation runs
- **WHEN** trusted PR policy proves complete regression unselected
- **THEN** the real multi-release predecessor scenario SHALL be reported as exhaustive-cadence deferred and not scheduled
- **AND** selected focused deterministic contracts SHALL retain their assertions and fail-closed outcomes

#### Scenario: Real predecessor coverage executes
- **WHEN** standalone or PR-attached Full regression, or nightly/stable release validation, selects complete coverage
- **THEN** the published-predecessor gate SHALL retain publication-time selection, the existing predecessor limit and override semantics, supported-entry checks, and the minimum exercised-predecessor assertion
- **AND** it SHALL exercise real predecessor release code against the exact candidate without using the user's npm installation prefix
- **AND** it SHALL not reduce coverage, add success retries, restore mutable installed fixtures, or replace published code with a candidate-authored oracle

#### Scenario: Focused coverage passes but exhaustive coverage fails
- **WHEN** deterministic predecessor contracts pass but selected exhaustive coverage fails
- **THEN** the exhaustive result SHALL remain failed and block its applicable PR or publication gate
- **AND** focused success SHALL not be reinterpreted as real published-predecessor compatibility evidence
