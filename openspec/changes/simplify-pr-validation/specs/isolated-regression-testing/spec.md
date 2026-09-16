## ADDED Requirements

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
