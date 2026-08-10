## Purpose

Defines an automated, isolated regression system that exercises AddOne and its agent drivers in real PTYs, preserves evidence, and lets deterministic checks and an independent evaluator detect failures before the user does.

## ADDED Requirements

### Requirement: Scenarios run in hermetic instances
Each full-system scenario SHALL use isolated application state, supervisor storage, runtime paths, Pi configuration, sessions, sockets, workspace, environment, and process tree.

#### Scenario: Run two scenarios concurrently
- **WHEN** two scenarios execute at the same time
- **THEN** neither scenario SHALL discover, control, or mutate the other's agents, sessions, sockets, or artifacts

#### Scenario: User configuration exists
- **WHEN** the developer machine contains normal Pi settings, extensions, sessions, and credentials
- **THEN** a hermetic scenario SHALL not load or mutate them unless the scenario explicitly imports a fixture

### Requirement: UI behavior is testable without real model access
The test system SHALL support deterministic fake or replay drivers that emit normalized lifecycle, conversation, tool, failure, extension-UI, and terminal events.

#### Scenario: Test working decoration
- **WHEN** a fake driver emits working and settled events
- **THEN** a test SHALL be able to assert the corresponding tab and sidebar states without contacting a model provider

#### Scenario: Test recovery failure
- **WHEN** a fake driver reports a session identity mismatch during recovery
- **THEN** a test SHALL be able to assert the exact recovery state and available actions deterministically

### Requirement: Real CLI scenarios execute through PTYs
AddOne acceptance scenarios SHALL be able to launch the real AddOne CLI in a PTY, send keyboard and resize events, and inspect normalized terminal cells, cursor state, and application artifacts.

#### Scenario: Drive a mixed workspace
- **WHEN** a scenario creates a Managed Pi tab and a terminal-agent tab through user-visible interactions
- **THEN** it SHALL verify switching, focus, input routing, and surface restoration through the real CLI process

#### Scenario: Terminal width regression
- **WHEN** a scenario resizes the CLI to a narrow supported width
- **THEN** it SHALL verify that required navigation and add-agent actions remain reachable

### Requirement: The first walking skeleton has deterministic nested-PTY visual validation
The test system SHALL exercise the real AddOne command, UI-to-supervisor boundary, and child-terminal path in PTYs while substituting a deterministic native-agent fixture for release-gating visual scenarios. It SHALL support keyboard, mouse, resize, normalized-cell, and cursor observations without model or network access.

#### Scenario: Validate intro and Native Pi tab creation
- **WHEN** the walking-skeleton scenario launches `addone`, observes the completed intro, and activates the `+` control
- **THEN** it SHALL verify from normalized terminal frames that the AddOne shell remains visible and a selected terminal tab presents the deterministic Pi fixture

#### Scenario: Validate nested terminal interaction
- **WHEN** the scenario sends input and resize events after the deterministic Pi fixture starts in the child PTY
- **THEN** it SHALL verify that unclaimed input reaches the child, shell input is consumed only by AddOne, and both outer chrome and the child surface reach their expected visual states

#### Scenario: Child fixture exits
- **WHEN** the deterministic Pi fixture exits with a configured status
- **THEN** the scenario SHALL verify that AddOne remains operational and presents the retained final surface and exit state

### Requirement: Every failed scenario preserves reproducible evidence
A failed scenario SHALL preserve its scenario definition, input timeline, runtime and profile versions, relevant process logs, supervisor events, normalized terminal frames, session references, assertions, and failure summary.

#### Scenario: PTY assertion fails
- **WHEN** an expected terminal condition is not met before its deadline
- **THEN** the artifact bundle SHALL include the final surface and preceding relevant frames rather than only a timeout message

### Requirement: Pi compatibility is certified before promotion
The test system SHALL run a defined compatibility matrix against each candidate Managed Pi runtime and extension profile before that candidate can become approved for new or migrated agents.

#### Scenario: Candidate changes RPC event shape
- **WHEN** the adapter contract suite cannot normalize a candidate Pi event or response
- **THEN** certification SHALL fail and the approved runtime SHALL remain unchanged

#### Scenario: Candidate preserves compatibility
- **WHEN** the candidate passes startup, prompt, tool, extension, exact-session recovery, and shutdown scenarios
- **THEN** the candidate MAY be marked approved without migrating existing agents automatically

### Requirement: Deterministic assertions remain the primary release oracle
Release-gating requirements with deterministic representations SHALL be asserted by code, while evaluator-agent judgments SHALL supplement those assertions for usability and visual-semantic regressions.

#### Scenario: Deterministic requirement fails but evaluator approves
- **WHEN** an evaluator agent reports success but a deterministic session-continuity assertion fails
- **THEN** the scenario SHALL remain failed

### Requirement: An independent evaluator can inspect candidate PTYs
The test system SHALL support a known-good evaluator agent that is isolated from the candidate process and can observe terminal snapshots, send controlled input, wait for states, request fault injection, and submit a structured verdict with evidence.

#### Scenario: Evaluator detects confusing recovery UX
- **WHEN** deterministic lifecycle checks pass but the candidate presents an ambiguous recovery interaction
- **THEN** the evaluator SHALL be able to fail or flag the scenario with referenced frames and a requirement-oriented explanation

#### Scenario: Candidate agent is broken
- **WHEN** the candidate's embedded or managed agent cannot operate correctly
- **THEN** the independent evaluator SHALL remain operational because it runs under a separately pinned known-good runtime

### Requirement: Regressions become permanent scenarios
A confirmed production or evaluator-discovered regression SHALL be representable as a reproducible fixture or scenario that runs independently of the original user environment.

#### Scenario: Regression is fixed
- **WHEN** a regression fix is accepted
- **THEN** its scenario SHALL pass on the fixed build and remain in the applicable regression suite
