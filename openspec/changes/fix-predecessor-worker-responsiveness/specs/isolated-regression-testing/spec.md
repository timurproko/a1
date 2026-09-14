## ADDED Requirements

### Requirement: Published predecessor subprocess waits preserve runner responsiveness
Published-predecessor compatibility validation SHALL remain able to process runner messages, timers, and cancellation while waiting for package installation, registry lookup, or shipped setup subprocesses. Command waits SHALL NOT block the test worker's event loop. This correction SHALL retain existing test, hook, warmup, runner, and workflow time limits, predecessor selection and coverage, exact candidate bytes, command ordering, and the requirement to execute each selected predecessor's own release code.

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

#### Scenario: Real predecessor coverage executes
- **WHEN** the published-predecessor gate validates a candidate
- **THEN** it SHALL retain publication-time selection, the existing default predecessor limit and override semantics, supported-entry checks, and the existing minimum exercised-predecessor assertion
- **AND** it SHALL exercise real predecessor release code against the exact selected candidate without using the user's npm installation prefix
- **AND** the repair SHALL NOT reduce coverage, add success retries, or move the test into a different execution class to hide an unresolved failure

### Requirement: Nightly recovery is proven by numbered merged-package evidence
A nightly recovery effort SHALL not be declared complete solely from focused tests, passing PR CI, an implementation merge, a branch Full regression run, or reduced-scope manual development publication. Completion SHALL require the actual scheduled nightly workflow to successfully perform full-release validation on a newly numbered package whose merged source contains the accepted repairs, across Windows Node 22 and 24, Linux Node 24, and macOS Node 24, with a successful aggregate publication or immutable-registry verification outcome.

Evidence SHALL identify source commit, merged-PR/version identity, package integrity/digest, nightly run and native job identities, selected full-release scope, and every lane's result. Existing registry bytes SHALL remain immutable. Additional failed stages SHALL remain explicit blockers until corrected and verified; their checks SHALL NOT be skipped or weakened to obtain a successful result.

#### Scenario: Nightly builds a new numbered package
- **WHEN** the repaired merged source selects a development version not yet published
- **THEN** the scheduled nightly SHALL build and pack that numbered candidate once and validate the same bytes in every native lane
- **AND** successful publication to the development channel SHALL be verified against the validated package identity before recovery is accepted

#### Scenario: The newer numbered package is already published
- **WHEN** an authorized development publication has already produced the repaired numbered package
- **THEN** scheduled nightly SHALL fully validate those exact immutable registry bytes on all four lanes
- **AND** a successful manual existing-version no-op SHALL NOT substitute for that validation

#### Scenario: Another validation stage fails
- **WHEN** any required native or publication stage fails after the initial correction
- **THEN** recovery SHALL remain incomplete with the failed stage and available cause evidence recorded
- **AND** further correction SHALL preserve the gate and receive the applicable scope approval before implementation

#### Scenario: The implementation is merged but nightly is pending
- **WHEN** accepted implementation has merged but the numbered-package nightly outcome is missing, failed, or incomplete
- **THEN** completed-change archival and retained-worktree cleanup SHALL remain blocked
- **AND** the implementation acceptance report SHALL NOT be represented as evidence of successful nightly recovery
