## MODIFIED Requirements

### Requirement: A1 exposes exactly three interactive launch forms

`a1 pi` SHALL be what rendering parity compares against pinned Pi, so what is measured is a command anyone can run rather than a mode that exists only while it is being measured. It SHALL use the same composition bare A1 uses, with A1's own surfaces withheld rather than a separate implementation of it.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch one transparent full-viewport Pi process using the normal A1 profile

#### Scenario: Launch vanilla Pi baseline
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL present pinned Pi's interface through its own rendering and input, using Pi's ordinary user profile
- **AND** no A1-owned surface SHALL be reachable from it


#### Scenario: Removed full-name executable is inspected
- **WHEN** npm installs the official A1 package
- **THEN** the installation SHALL NOT create an `addone` executable

#### Scenario: Agent alias is requested
- **WHEN** the user runs `a1 agent`
- **THEN** A1 SHALL reject the unknown subcommand, explain that bare `a1` is the agent experience, and display concise usage without launching Pi

#### Scenario: Multi-agent UX is introduced later
- **WHEN** a separately approved multi-agent change replaces the initial single-foreground A1 presentation
- **THEN** bare `a1` SHALL remain the entry point and `a1 pi` SHALL retain their explicit meanings
