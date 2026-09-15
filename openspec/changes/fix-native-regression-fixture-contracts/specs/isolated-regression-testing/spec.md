## MODIFIED Requirements

### Requirement: Scenarios run in hermetic instances
Automated scenarios SHALL isolate application state, supervisor storage, runtime paths, Pi configuration, endpoints, environment, artifacts, and owned process trees from user state and from concurrent scenarios. An operating-system-boundary fixture SHALL supply controlled results at the acquisition boundary actually selected on its native platform, including command-based fallbacks, and SHALL NOT access the host clipboard or require an interactive clipboard service. Successful and failing scenarios SHALL await verified completion of their owned executors before releasing fixture state or asserting capacity in subsequent scenarios.

#### Scenario: Run scenarios concurrently
- **WHEN** two scenarios execute at the same time
- **THEN** neither SHALL discover, control, or mutate the other's state or processes

#### Scenario: User configuration exists
- **WHEN** a machine contains normal Pi settings, extensions, sessions, and credentials
- **THEN** a hermetic scenario SHALL not load or mutate them unless explicitly supplied as identified input

#### Scenario: Clipboard acquisition uses a platform command
- **WHEN** a hermetic clipboard regression runs on a platform whose text acquisition uses operating-system commands instead of a native text adapter
- **THEN** the fixture SHALL intercept that command boundary without invoking the host clipboard
- **AND** the real helper protocol and downstream classification SHALL process the controlled result
- **AND** supplied text, successful empty acquisition, denied acquisition, and supported fallback SHALL retain their distinct production outcomes
- **AND** an unexpected acquisition operation SHALL fail the fixture rather than escape to an uncontrolled host service

#### Scenario: Cold packaged clipboard acquisition executes
- **WHEN** the packaged clipboard regression runs emitted helper and worker entries
- **THEN** it SHALL retain the same controlled acquisition semantics and exact independent payload assertions as the source regression
- **AND** fixture interception SHALL NOT replace the emitted helper or classification behavior with a self-generated success response

#### Scenario: A clipboard assertion fails before executor shutdown
- **WHEN** a clipboard regression rejects before its owned executor has stopped
- **THEN** teardown SHALL cancel if necessary and await that executor's completion even on the failure path
- **AND** the original failure SHALL remain visible without leaking executor capacity, owned processes, or fixture state into a later scenario
- **AND** assertions about configured executor capacity SHALL NOT be reduced to accommodate leaked state

### Requirement: Confirmed regressions receive architecture-appropriate coverage
A confirmed regression SHALL gain the smallest independent current-contract test capable of detecting its cause. Physical-only behavior SHALL remain at the physical/integration boundary instead of being duplicated by a self-modelled simulation. A subprocess-directory regression SHALL distinguish filesystem identity from lexical path spelling while retaining exact argument and environment contracts; alias acceptance SHALL NOT admit execution in a different directory. Diagnostic evidence for a failing native regression SHALL be bounded, preserve the original result, identify observed phase or operation timing where available, and exclude private payloads. Test-fixture corrections SHALL retain existing deadlines, independent assertions, real exercised operations, and failure-safe ownership; diagnostic instrumentation or isolated success SHALL NOT itself count as recovery.

#### Scenario: Regression belongs to deterministic logic
- **WHEN** a defect is isolated to domain, storage, protocol, release, or update behavior
- **THEN** A1 SHALL add a focused deterministic test and pass its containing gate

#### Scenario: Regression crosses the physical boundary
- **WHEN** a rendering or input defect cannot be represented independently in a unit test
- **THEN** A1 SHALL retain it for isolated physical or exact-package integration certification

#### Scenario: A temporary path names an aliased directory
- **WHEN** a subprocess starts in a requested directory whose lexical spelling differs from the platform's reported canonical path
- **THEN** the regression SHALL verify that the child actually uses the independently identified requested directory
- **AND** equivalent aliases SHALL pass while a distinct-directory negative control SHALL fail
- **AND** exact arguments, space-containing paths, and environment-isolation assertions SHALL remain enforced

#### Scenario: Asynchronous shell paste misses its assertion deadline
- **WHEN** a native shell regression retains a pending image or fails to apply the expected clipboard fallback before its existing deadline
- **THEN** diagnosis SHALL distinguish observed acquisition, preparation, completion, and cleanup phases without disclosing clipboard contents
- **AND** correction SHALL retain real asynchronous completion, exact image/text and submission assertions, and the original wait/test limits
- **AND** teardown SHALL release the scenario's owned shell work even when the assertion fails
- **AND** a longer wait, synthetic completion, or an isolated passing rerun SHALL NOT substitute for a verified correction

#### Scenario: Real Git release validation exceeds its deadline
- **WHEN** a release-workflow regression using isolated real repositories exceeds its existing test limit
- **THEN** bounded operation timing and counts SHALL preserve the original failure and the real Git-backed workflow outcome
- **AND** fixture correction SHALL retain independently verified source/version identities, manual integration gates, publication ordering, and dirty/unrelated state protections
- **AND** real operations SHALL NOT be replaced with fabricated answers, stale cached assertions, shared mutable fixtures, omitted checks, or work shifted outside the measured scenario
- **AND** the existing deadline SHALL remain enforced
