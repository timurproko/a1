## MODIFIED Requirements

### Requirement: A1 exposes product and Pi-comparison launch forms
Bare `a1` SHALL launch the product surface. The prerelease `pi` subcommand SHALL present pinned Pi's interface with product surfaces withheld. Both SHALL use the owned rendering pipeline.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL present one full-viewport session drawn by A1, using the normal A1 profile, with A1's own surfaces reachable

#### Scenario: Launch vanilla Pi baseline
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL present one full-viewport session drawn by A1, using Pi's ordinary user profile, showing pinned Pi's interface and none of A1's own surfaces


#### Scenario: Removed full-name executable is inspected
- **WHEN** npm installs the official A1 package
- **THEN** the installation SHALL NOT create an executable named for the former brand

#### Scenario: Agent alias is requested
- **WHEN** the user runs `a1 agent`
- **THEN** A1 SHALL reject the unknown subcommand, explain that bare `a1` is the agent experience, and display concise usage without launching Pi

#### Scenario: Multi-agent UX is introduced later
- **WHEN** a separately approved multi-agent change replaces the initial single-foreground A1 presentation
- **THEN** bare `a1` SHALL remain the entry point and `a1 pi` SHALL retain its explicit comparison meaning

### Requirement: All launch forms share one rendering pipeline
Normal A1 and vanilla Pi SHALL run the same composition, rendering, and input handling. What a launch form selects SHALL be its configuration root and whether A1's own surfaces are reachable; it SHALL NOT select a different way of putting a screen on the terminal. No launch form SHALL relay, parse, or re-render another process's terminal traffic.

#### Scenario: Compare profile presentation paths
- **WHEN** either launch form starts
- **THEN** the same composition SHALL draw the session, and the forms SHALL differ only in configuration root and in whether A1's own surfaces are reachable

#### Scenario: A launch form is added or changed
- **WHEN** a launch form is introduced or its meaning changes
- **THEN** it SHALL use the shared pipeline rather than attaching a separate process to the terminal

## REMOVED Requirements

### Requirement: All launch forms preserve transparent terminal ownership
**Reason**: Both retained forms now use the owned rendering pipeline, so transparent terminal ownership no longer describes current behavior.

**Migration**: Preserve the profile each retained form reads while using one rendering path.
