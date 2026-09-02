## MODIFIED Requirements

### Requirement: Tests prove current contracts without duplicating implementation
Every retained test SHALL identify a current contract and the smallest independent boundary capable of proving it. Tests SHALL NOT be retained for deleted behavior, historical bug names alone, private implementation shape, duplicated assertions already covered at a stronger boundary, or self-modelled terminal behavior. A validation tier SHALL NOT perform an equivalent complete-repository documentation scan twice or reproduce an equivalent rendering producer/mode/workload matrix solely because separate test files consume different assertions; one authoritative captured result SHALL support all applicable assertions at that boundary.

#### Scenario: Multiple tests prove the same contract
- **WHEN** two tests exercise the same cause and observable outcome without distinct boundary risk
- **THEN** the baseline audit SHALL retain the clearest minimal test and remove or consolidate the redundant test

#### Scenario: Confirmed regression still has a live cause
- **WHEN** a historical regression maps to a current deterministic contract
- **THEN** its test SHALL be expressed under the current owner and named for the invariant rather than the obsolete implementation story

#### Scenario: Test belongs to deferred physical certification
- **WHEN** a test or fixture exists only to implement future physical-host automation
- **THEN** it SHALL be removed from the active baseline or moved into the separately authorized future change and SHALL not run on ordinary workstations or preview gates

#### Scenario: Documentation command and repository baseline overlap
- **WHEN** an authoritative documentation command already evaluates the selected repository scope in a validation tier
- **THEN** the ordinary Vitest remainder SHALL retain fixture-based policy tests but SHALL NOT repeat the same repository-wide baseline scan

#### Scenario: Rendering assertions share one workload result
- **WHEN** semantic parity, terminal paint, determinism, and damage budgets require the same rendering producer/mode/workload matrix
- **THEN** the gate SHALL capture that matrix once and SHALL evaluate every applicable assertion from the shared evidence

## ADDED Requirements

### Requirement: Documentation governance is incremental during development and complete nightly
Pull-request and local development documentation governance SHALL inspect policy-relevant files that are modified, newly added, or renamed to a new path in the current change. It MAY resolve bounded ownership, export, and dependency metadata needed to determine the changed file's policy obligations, but SHALL NOT scan every unchanged source file as a development prerequisite. A deletion without a modified or new destination SHALL require no documentation-content check. The ordinary fast tier SHALL execute one authoritative changed-file documentation check plus focused fixture-based policy tests, not a second complete-repository baseline scan.

The scheduled nightly workflow SHALL run one full documentation-governance review over every tracked policy-relevant file at the exact authoritative `origin/develop` commit. That review SHALL be platform-independent, SHALL execute once rather than once per release matrix platform, SHALL report all offending paths and rules, and SHALL gate successful nightly completion. Maintainers SHALL retain an explicit complete-review command and manual workflow path for on-demand use.

#### Scenario: Existing source file is modified
- **WHEN** a pull request modifies a policy-relevant tracked source file
- **THEN** development validation SHALL inspect the complete changed file against every applicable documentation rule
- **AND** a violation in that file SHALL fail the required pull-request gate

#### Scenario: New source file is added
- **WHEN** a pull request adds a policy-relevant source file
- **THEN** development validation SHALL classify its ownership and source role and SHALL inspect it against every applicable documentation rule

#### Scenario: Source file is renamed
- **WHEN** a policy-relevant file receives a new path
- **THEN** development validation SHALL treat the destination as a changed file and SHALL apply path-sensitive documentation rules at the new location

#### Scenario: Source file is only deleted
- **WHEN** a policy-relevant file is deleted without a modified or new destination
- **THEN** development documentation validation SHALL not attempt to inspect content that no longer exists

#### Scenario: Changed export needs bounded context
- **WHEN** documentation obligations for a changed file depend on its declared owner or public export relationship
- **THEN** the checker MAY resolve only the bounded metadata needed to classify that changed file
- **AND** it SHALL not turn that resolution into an unconditional complete-repository source scan

#### Scenario: Ordinary code pull request runs policy tests
- **WHEN** the fast tier validates a code pull request
- **THEN** fixture-based tests SHALL continue proving source roles, public contracts, comment hygiene, diagnostics, and changed-file selection behavior
- **AND** only one command SHALL inspect the pull request's real changed files

#### Scenario: Nightly review runs
- **WHEN** the scheduled nightly workflow selects the authoritative `origin/develop` source
- **THEN** one job SHALL inspect every tracked policy-relevant file at that exact commit
- **AND** any violation SHALL fail nightly completion with actionable evidence

#### Scenario: Complete review is requested manually
- **WHEN** a maintainer invokes the complete documentation command or its declared manual workflow
- **THEN** the same full tracked-repository invariant used nightly SHALL execute and report its timing and result
