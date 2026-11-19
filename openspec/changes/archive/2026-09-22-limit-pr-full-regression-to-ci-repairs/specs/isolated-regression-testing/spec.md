## MODIFIED Requirements

### Requirement: Changed tests pass in pull-request validation
A retained or newly added pull-request-eligible test SHALL pass in the pull-request validation of continuous integration before its change is integrated. A changed exhaustive-only test SHALL receive focused deterministic contract validation in the ordinary PR scopes and SHALL remain mandatory in Full regression and nightly/release validation. Only when trusted PR policy proves that the PR was created by regression-triage automation from a failed Full regression SHALL the exhaustive test additionally execute within that PR's full suite; otherwise it SHALL be recorded as cadence-deferred. Local execution is an optional debugging aid, not a completion gate.

#### Scenario: Pull-request validation passes
- **WHEN** continuous integration validates the pull request containing changed pull-request-eligible tests
- **THEN** every selected changed test SHALL pass before the change MAY be integrated
- **AND** no local suite execution SHALL be required

#### Scenario: Exhaustive-only test changes
- **WHEN** a human-authored or otherwise ineligible PR changes an exhaustive test
- **THEN** ordinary validation SHALL run its focused deterministic contract coverage and report the exhaustive test as cadence-deferred
- **AND** changed release, workflow, build, shared-support, validation-authority, or unknown paths SHALL NOT independently schedule PR Full regression
- **AND** the exhaustive test SHALL remain required in scheduled/manual Full regression and nightly/release validation without reduced assertions

#### Scenario: Exhaustive-only test changes with full selection
- **WHEN** valid App-author and failed-Full-regression provenance select PR Full regression for a CI-created repair
- **THEN** the retained exhaustive test SHALL execute in the PR full suite with its original assertions and targets
- **AND** focused deterministic success SHALL not substitute for a failed exhaustive result

### Requirement: Development startup validation uses one required Windows runtime lane
For non-draft pull requests into `develop` that are neither documentation-only nor version-only, ordinary Development scopes SHALL select first-attempt exact-package startup according to the complete trusted impact selection. An ordinary selected startup scope SHALL run exactly one Windows Node 22 startup lane and SHALL NOT schedule an additional Node 24 lane in that bounded scope. Manual invocation of Development validation SHALL retain the same ordinary startup runtime selection and conservative retained development scopes when no trusted comparison exists. Only a CI-created repair with valid failed-Full-regression provenance SHALL additionally execute the complete suite, including Windows Node 22 and Node 24, through its shared complete-regression matrix. This explicit full-suite exception SHALL not change ordinary scope cadence or supported Node runtimes.

The retained Node 22 startup scope SHALL preserve first-attempt exact-package startup checks, enabled Defender real-time protection, unchanged performance limits, isolation, assertions, failure semantics, and evidence artifacts. Image preparation, packaged image workers, and durable-history compatibility SHALL remain Node 22 impact-selectable ordinary scopes independent of startup timing. Package identity, layer reuse, cleanup backlog, and updater cancellation/loss scenarios SHALL retain explicit exact-package owners. Changed tests and support SHALL select all affected ordinary owners even without production changes. Full-regression and nightly/release compositions SHALL retain all extracted scenarios on their existing applicable platforms and runtimes.

Ordinary documentation-only, version-only, and draft exemptions SHALL remain unchanged except for the eligible generated repair's selected PR Full regression. Planning-only generated repair drafts SHALL stay lightweight; their implementation-bearing drafts MAY run full validation without gaining integration authority. No reduced startup smoke test SHALL replace the complete selected startup contract or weaken the required aggregate.

#### Scenario: Applicable code PR is validated
- **WHEN** a ready ordinary PR has startup impact and lacks valid generated failed-Full-regression repair provenance
- **THEN** exactly one Windows startup lane SHALL run on Node 22
- **AND** no Node 24 startup job SHALL be queued or required for that PR
- **AND** retained startup assertions SHALL execute without semantic retries or ignored failures

#### Scenario: Full regression is selected inside a PR
- **WHEN** trusted CI's App-created failed-Full-regression repair requires complete regression
- **THEN** its full matrix SHALL retain both Windows runtimes and the complete startup contract
- **AND** ordinary Node 22 success SHALL not exempt the selected full Node 24 result

#### Scenario: Release or validation-authority PR is evaluated
- **WHEN** an ordinary PR changes release, publication, build, workflow, configuration, shared-support, or validation-authority inputs
- **THEN** its applicable ordinary owners SHALL run without scheduling PR Full regression
- **AND** complete coverage SHALL remain available through scheduled/manual Full regression and nightly/stable release validation

#### Scenario: Exempt or draft PR is evaluated
- **WHEN** an unselected docs-only or version-only PR, or a planning-only draft, is evaluated
- **THEN** existing lightweight behavior SHALL be preserved without starting startup lanes unnecessarily

#### Scenario: Development validation is manually dispatched
- **WHEN** the maintainer invokes ordinary Development validation for a non-exempt source without a trusted impact comparison
- **THEN** its startup portion SHALL run on Windows Node 22 only and retained development compatibility scopes SHALL run
- **AND** complete Windows Node 24 coverage SHALL remain available through Full regression

#### Scenario: Startup is proven unrelated
- **WHEN** complete trusted classification proves a ready PR does not affect startup, no supporting input or invalidator changed, and generated-repair Full regression is unselected
- **THEN** the ordinary Node 22 startup job SHALL be explicitly unselected
- **AND** mandatory fast partitions and every other selected integration scope SHALL still gate the PR

#### Scenario: Image or history compatibility changes
- **WHEN** an image/history implementation, packaged worker, test, or shared dependency changes
- **THEN** all affected Node 22 compatibility owners SHALL execute independently of whether ordinary startup timing is selected
- **AND** any transitive startup impact SHALL still select startup validation

#### Scenario: Cleanup scenarios move out of the startup suite
- **WHEN** package cleanup or recovery scenarios receive separate suite ownership
- **THEN** their existing exact-package assertions, representative backlog sizes, failure cases, and full-validation platform/runtime coverage SHALL remain intact
- **AND** changes to those tests or their dependencies SHALL require their ordinary PR execution
