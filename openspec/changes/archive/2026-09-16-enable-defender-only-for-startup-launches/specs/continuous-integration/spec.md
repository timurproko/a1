## ADDED Requirements

### Requirement: Shared exact-package installation is prepared and handed off explicitly
A publication or complete regression lane SHALL be able to perform its one shared exact-package installation as a separate command from the command that runs the owners consuming it, so the workflow can change runner state between them. The preparing command SHALL verify the existing build receipt when a verified install-time build is declared, SHALL verify the package receipt for the exact candidate, SHALL perform exactly one installation for the planned consumers, SHALL write one bounded handoff naming its schema, consumers, prepared paths, measured duration, and verified receipt, and SHALL run no other planned command.

The consuming command SHALL verify a supplied handoff against the same lane, candidate digest, installation policy, declared consumers, and installed bytes before any owner executes, and SHALL record the preparation as a verified shared preparation carrying the duration the preparing command measured. A malformed handoff, a handoff that contradicts the plan, and a handoff that fails verification SHALL each produce one failed preparation outcome and SHALL NOT cause a second installation. The consuming command SHALL retain ownership of removing the prepared installation at the end of the run whether it prepared that installation or received it. When no handoff is supplied, preparation SHALL remain lazy and unchanged.

#### Scenario: A lane prepares before changing runner state
- **WHEN** a publication or complete regression lane prepares the exact package as its own step
- **THEN** exactly one installation SHALL occur for the planned consumers
- **AND** the lane SHALL be free to change runner protection state before the consuming command starts

#### Scenario: A consuming command receives a valid handoff
- **WHEN** the consuming command verifies a handoff for its own lane, candidate, policy, and consumers
- **THEN** it SHALL record one verified shared preparation with the measured preparation duration
- **AND** every consuming owner SHALL still verify the installation around its own invocation and report a separate result

#### Scenario: A handoff is malformed or unverifiable
- **WHEN** a supplied handoff is malformed, contradicts the plan, or fails exact-package verification
- **THEN** the run SHALL record one failed preparation outcome and stop before any owner executes
- **AND** it SHALL NOT perform a second installation

#### Scenario: No handoff is supplied
- **WHEN** a local run or ordinary pull-request validation runs the tier without a handoff
- **THEN** preparation SHALL remain lazy, bound to the first consuming invocation, and otherwise unchanged
