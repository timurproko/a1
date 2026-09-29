## MODIFIED Requirements

### Requirement: Resource-sensitive regressions avoid shared runner contention

Automated tests that repeatedly create repositories, launch subprocesses, mutate temporary storage, or coordinate release processes SHALL be eligible for a declared resource-sensitive execution class. Tests in that class SHALL run one file at a time in one serial process under the partition's explicit hang bound rather than sharing the parallel fast-test worker pool. Classification SHALL be reviewed configuration, SHALL be applied consistently across supported platforms, and SHALL not suppress output, remove assertions, or authorize retries of semantic failures. The hang bound SHALL be a fixed explicit value shared with the other explicit fast-tier invocations, not a per-test allowance that grows to fit a slow test. Repeated isolated evidence SHALL expose available fixture and subprocess timing and SHALL name every test body above five seconds, and a test that stays on that list SHALL be optimized rather than accommodated. Tests not assigned to the class SHALL retain the ordinary fast scheduler unless another declared isolation contract applies.

Complete-regression workflow sharding MAY place the entire resource-sensitive partition on a separate hosted runner that executes concurrently with other independent partitions. It SHALL NOT divide the resource-sensitive files across concurrent processes or runners, enable file parallelism, change their timeout, retry them, or share their mutable fixture state with another shard.

#### Scenario: A repeated contention timeout is confirmed

- **WHEN** evidence shows a process- or filesystem-intensive fast test passes independently but intermittently times out while sharing the parallel runner
- **THEN** the test MAY be assigned to the resource-sensitive class with its evidence recorded
- **AND** its assertions and fail-closed outcome SHALL remain unchanged

#### Scenario: Resource-sensitive tests execute

- **WHEN** multiple tests in the resource-sensitive class are selected
- **THEN** their files SHALL execute without file parallelism in one process under the explicit hang bound
- **AND** no selected file SHALL execute more than once

#### Scenario: Full regression shards Windows work

- **WHEN** Windows Full regression runs the resource-sensitive partition concurrently with core, rendering, and package shards
- **THEN** every resource-sensitive file SHALL remain together in one serial shard process with the unchanged explicit hang bound
- **AND** separate hosted runners SHALL prevent another shard's temporary storage or subprocesses from becoming shared fixture state

#### Scenario: Serialization is insufficient

- **WHEN** a resource-sensitive test body stays above five seconds during repeated isolated execution
- **THEN** its setup and subprocess phases SHALL be measured and optimized
- **AND** the test SHALL NOT receive its own larger bound or an automatic retry

#### Scenario: An ordinary test is not resource-sensitive

- **WHEN** a fast test has no declared resource-sensitive ownership and no other isolation requirement
- **THEN** it SHALL remain in the ordinary parallel remainder

### Requirement: Published predecessor subprocess waits preserve runner responsiveness

Published-predecessor compatibility validation SHALL remain able to process runner messages, timers, and cancellation while waiting for package installation, registry lookup, or shipped setup subprocesses. Command waits SHALL NOT block the test worker's event loop. The real multi-release scenario SHALL retain existing test, hook, warmup, runner, and workflow time limits, predecessor selection and coverage, exact candidate bytes, command ordering, and the requirement to execute each selected predecessor's own release code.

The real multi-release scenario SHALL use exhaustive cadence: it SHALL run in manual, scheduled, and selected PR-attached Full regression and in nightly/stable release validation. It SHALL NOT be added to ordinary bounded Development scopes. Those scopes SHALL retain focused deterministic predecessor command, lifecycle, error, fixture, materialization, and warmup contracts, but SHALL NOT claim that those contracts exercised published predecessor code. Without full-regression selection the real scenario SHALL remain explicitly deferred; with full selection its complete result SHALL gate the PR. Complete-regression workflow sharding MAY assign the unchanged real scenario to a dedicated package shard and exclude it from the ordinary remainder, provided it executes exactly once for each supported runtime and its shard result cannot independently satisfy the runtime lane. This exception SHALL not reduce its default predecessor count, supported-entry checks, exact-package authority, assertions, or failure semantics.

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

#### Scenario: Real predecessor coverage executes in a shard

- **WHEN** standalone or PR-attached Full regression assigns published-predecessor coverage to the Windows package shard
- **THEN** the scenario SHALL execute once for that runtime with its unchanged predecessor count, exact candidate, published-code oracle, command ordering, assertions, and limits
- **AND** missing or failed package-shard evidence SHALL block the reconstructed Windows lane even if every other shard passes

#### Scenario: Real predecessor coverage executes

- **WHEN** standalone or PR-attached Full regression, or nightly/stable release validation, selects complete coverage
- **THEN** the published-predecessor gate SHALL retain publication-time selection, the existing predecessor limit and override semantics, supported-entry checks, and the minimum exercised-predecessor assertion
- **AND** it SHALL exercise real predecessor release code against the exact candidate without using the user's npm installation prefix
- **AND** it SHALL not reduce coverage, add success retries, restore mutable installed fixtures, or replace published code with a candidate-authored oracle

#### Scenario: Focused coverage passes but exhaustive coverage fails

- **WHEN** deterministic predecessor contracts pass but selected exhaustive coverage fails
- **THEN** the exhaustive result SHALL remain failed and block its applicable PR or publication gate
- **AND** focused success SHALL not be reinterpreted as real published-predecessor compatibility evidence
