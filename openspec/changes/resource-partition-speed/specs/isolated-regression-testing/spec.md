## MODIFIED Requirements

### Requirement: Resource-sensitive regressions avoid shared runner contention
Automated tests that repeatedly create repositories, launch subprocesses, mutate temporary storage, or coordinate release processes SHALL be eligible for a declared resource-sensitive execution class. Tests in that class SHALL run one file at a time in one serial process under the partition's explicit hang bound rather than sharing the parallel fast-test worker pool. Classification SHALL be reviewed configuration, SHALL be applied consistently across supported platforms, and SHALL not suppress output, remove assertions, or authorize retries of semantic failures. The hang bound SHALL be a fixed explicit value shared with the other explicit fast-tier invocations, not a per-test allowance that grows to fit a slow test. Repeated isolated evidence SHALL expose available fixture and subprocess timing and SHALL name every test body above five seconds, and a test that stays on that list SHALL be optimized rather than accommodated. Tests not assigned to the class SHALL retain the ordinary fast scheduler unless another declared isolation contract applies.

#### Scenario: A repeated contention timeout is confirmed
- **WHEN** evidence shows a process- or filesystem-intensive fast test passes independently but intermittently times out while sharing the parallel runner
- **THEN** the test MAY be assigned to the resource-sensitive class with its evidence recorded
- **AND** its assertions and fail-closed outcome SHALL remain unchanged

#### Scenario: Resource-sensitive tests execute
- **WHEN** multiple tests in the resource-sensitive class are selected
- **THEN** their files SHALL execute without file parallelism in one process under the explicit hang bound
- **AND** no selected file SHALL execute more than once

#### Scenario: Serialization is insufficient
- **WHEN** a resource-sensitive test body stays above five seconds during repeated isolated execution
- **THEN** its setup and subprocess phases SHALL be measured and optimized
- **AND** the test SHALL NOT receive its own larger bound or an automatic retry

#### Scenario: An ordinary test is not resource-sensitive
- **WHEN** a fast test has no declared resource-sensitive ownership and no other isolation requirement
- **THEN** it SHALL remain in the ordinary parallel remainder

### Requirement: Durable regression oracles protect current behavior
A permanent regression test SHALL protect a current product, compatibility, or repository-policy contract through behavior, structured policy, or a hermetic fixture. It SHALL NOT depend on the continued active location of an OpenSpec change, reread one-time implementation or benchmark evidence as its runtime oracle, or require exact explanatory prose when equivalent wording preserves the contract. One-time planning, benchmark, and acceptance evidence SHALL be validated by its producing operation and OpenSpec finalization or audit, then retained as historical evidence without remaining a prerequisite of unrelated product test runs.

Tests for generators and evidence readers SHALL use temporary or versioned fixtures that exercise supported schemas and failure behavior. Tests for workflow guidance SHALL assert stable structured policy or executable launch behavior; exact text SHALL be required only when that text is itself a declared external contract. Removing a historical-evidence assertion SHALL NOT remove the underlying current behavior test, full-suite owner, release contract, or accepted evidence file.

#### Scenario: An OpenSpec change is archived
- **WHEN** a completed change moves from its active directory into a dated archive
- **THEN** permanent product and governance tests SHALL continue to pass without rewriting paths to that historical change
- **AND** archive validation SHALL preserve the evidence under its accepted archive identity

#### Scenario: One-time performance evidence is retained
- **WHEN** implementation acceptance records a local or hosted benchmark report
- **THEN** finalization or audit SHALL validate the report required by that change
- **AND** unrelated future PR tests SHALL NOT reread the report as proof of current runtime behavior

#### Scenario: Policy wording changes without changing meaning
- **WHEN** explanatory workflow text is shortened or rephrased while retaining the same structured or executable requirement
- **THEN** regression validation SHALL evaluate the retained semantic contract rather than an exact sentence
- **AND** a separately declared user-visible text contract, if any, SHALL remain exact

#### Scenario: Evidence tooling changes
- **WHEN** a generator, parser, finalizer, or reader for evidence changes
- **THEN** hermetic fixtures SHALL prove supported schema, identity, bounds, and failure behavior
- **AND** the test SHALL not depend on mutable repository history or a particular prior change remaining active

#### Scenario: A historical-only assertion is removed
- **WHEN** audit shows a test's only oracle is an accepted change's static evidence or prose
- **THEN** that assertion MAY be removed or replaced with a hermetic semantic test
- **AND** current product assertions, retained suite ownership, release coverage, and the historical evidence itself SHALL remain intact

#### Scenario: An isolated helper completes asynchronously
- **WHEN** a regression assertion depends on an owned child process adopting a prepared value
- **THEN** the fixture SHALL synchronize on the helper's structured completion event rather than use a generic polling deadline as completion authority
- **AND** the semantic assertion, failure behavior, and production timeout policy SHALL remain unchanged

#### Scenario: Resume behavior uses an exact package candidate
- **WHEN** resume integration validates supervisor, guardian, and UI behavior from exact packed candidate bytes
- **THEN** the fixture MAY prepare, certify, and activate those bytes through production release-store operations before starting the bounded public resume launch
- **AND** separate exact-package and first-attempt startup scopes SHALL retain cold materialization and startup authority
- **AND** resume readiness SHALL be polled with backoff to one generous hang bound, SHALL report the startup phases reached when that bound expires, and SHALL NOT be retried
