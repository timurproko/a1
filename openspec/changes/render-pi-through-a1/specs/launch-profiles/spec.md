## MODIFIED Requirements

### Requirement: A1 exposes exactly three interactive launch forms
The `a1` binary SHALL be the sole installed public command. Bare invocation SHALL be the A1 agent product surface and initially launch the normal single-foreground A1 profile, the `pi` subcommand SHALL present pinned Pi's interface through A1's own rendering and input with none of A1's own surfaces, and the `sandbox` subcommand SHALL launch the isolated sandbox profile as vanilla Pi. A1 SHALL NOT install an `addone` executable or expose an `agent` subcommand alias; future multi-agent UX SHALL evolve bare invocation.

`a1 pi` SHALL be what rendering parity compares against pinned Pi, so what is measured is a command anyone can run rather than a mode that exists only while it is being measured. It SHALL use the same composition bare A1 uses, with A1's own surfaces withheld rather than a separate implementation of it.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch one transparent full-viewport Pi process using the normal A1 profile

#### Scenario: Launch vanilla Pi baseline
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL present pinned Pi's interface through its own rendering and input, using Pi's ordinary user profile
- **AND** no A1-owned surface SHALL be reachable from it

#### Scenario: Launch sandbox profile
- **WHEN** the user runs `a1 sandbox`
- **THEN** A1 SHALL launch one transparent full-viewport Pi process using the isolated A1 sandbox profile

#### Scenario: Removed full-name executable is inspected
- **WHEN** npm installs the official A1 package
- **THEN** the installation SHALL NOT create an `addone` executable

#### Scenario: Agent alias is requested
- **WHEN** the user runs `a1 agent`
- **THEN** A1 SHALL reject the unknown subcommand, explain that bare `a1` is the agent experience, and display concise usage without launching Pi

#### Scenario: Multi-agent UX is introduced later
- **WHEN** a separately approved multi-agent change replaces the initial single-foreground A1 presentation
- **THEN** bare `a1` SHALL remain the entry point and `a1 pi` plus `a1 sandbox` SHALL retain their explicit meanings
