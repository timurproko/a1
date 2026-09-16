## MODIFIED Requirements

### Requirement: Changed tests pass in pull-request validation
A retained or newly added pull-request-eligible test SHALL pass in the pull-request validation of continuous integration before its change is integrated. A changed exhaustive-only test SHALL receive focused deterministic contract validation in the pull request, SHALL be recorded as cadence-deferred, and SHALL remain mandatory in Full regression and nightly/release validation. Local execution is an optional debugging aid, not a completion gate.

#### Scenario: Pull-request validation passes
- **WHEN** continuous integration validates the pull request containing changed pull-request-eligible tests
- **THEN** every selected changed test SHALL pass before the change MAY be integrated
- **AND** no local suite execution SHALL be required

#### Scenario: Exhaustive-only test changes
- **WHEN** a pull request changes a test whose declared cadence is exhaustive
- **THEN** pull-request validation SHALL run its focused deterministic contract coverage and report the exhaustive test as cadence-deferred
- **AND** the exhaustive test SHALL remain required in Full regression and nightly/release validation without reduced assertions

### Requirement: Published predecessor subprocess waits preserve runner responsiveness
Published-predecessor compatibility validation SHALL remain able to process runner messages, timers, and cancellation while waiting for package installation, registry lookup, or shipped setup subprocesses. Command waits SHALL NOT block the test worker's event loop. The real multi-release scenario SHALL retain existing test, hook, warmup, runner, and workflow time limits, predecessor selection and coverage, exact candidate bytes, command ordering, and the requirement to execute each selected predecessor's own release code.

The real multi-release scenario SHALL use exhaustive cadence: it SHALL run in manual Full regression and scheduled nightly/stable release validation and SHALL NOT run in ordinary `pull_request` or manual Development validation. Pull-request validation SHALL retain focused deterministic predecessor command, lifecycle, error, fixture, materialization, and warmup contracts, but SHALL NOT claim that those contracts exercised published predecessor code. Moving the real scenario SHALL not reduce its default predecessor count, supported-entry checks, exact-package authority, assertions, or failure semantics.

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
- **WHEN** the enclosing validation is cancelled or expires while an owned command is active
- **THEN** its command lifetime SHALL end through ownership-safe cleanup before temporary installation removal
- **AND** unrelated processes and paths SHALL remain untouched

#### Scenario: Ordinary pull-request validation runs
- **WHEN** a product, test, workflow, selector, or unknown operational change is validated by the Development pull-request workflow
- **THEN** the real multi-release predecessor scenario SHALL be reported as exhaustive-cadence deferred and SHALL not be scheduled
- **AND** focused deterministic predecessor contracts selected by the change SHALL retain their assertions and fail-closed outcomes

#### Scenario: Real predecessor coverage executes
- **WHEN** Full regression or nightly/stable release validation selects complete coverage
- **THEN** the published-predecessor gate SHALL retain publication-time selection, the existing default predecessor limit and override semantics, supported-entry checks, and the existing minimum exercised-predecessor assertion
- **AND** it SHALL exercise real predecessor release code against the exact selected candidate without using the user's npm installation prefix
- **AND** it SHALL not reduce coverage, add success retries, restore mutable installed fixtures, or replace published code with a candidate-authored oracle

#### Scenario: Focused coverage passes but exhaustive coverage fails
- **WHEN** deterministic pull-request predecessor contracts pass and a later exhaustive run fails
- **THEN** the exhaustive workflow SHALL remain failed and block its publication authority
- **AND** focused PR success SHALL not be reinterpreted as real published-predecessor compatibility evidence
