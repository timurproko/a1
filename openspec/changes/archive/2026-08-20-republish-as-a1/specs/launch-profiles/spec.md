## MODIFIED Requirements

### Requirement: AddOne exposes exactly three interactive launch forms
The `a1` binary SHALL be the sole installed public command. Bare invocation SHALL be the AddOne agent product surface and initially launch the normal single-foreground AddOne profile, the `pi` subcommand SHALL launch the vanilla Pi baseline, and the `sandbox` subcommand SHALL launch the isolated sandbox profile. AddOne SHALL NOT install an `addone` executable or expose an `agent` subcommand alias; future multi-agent UX SHALL evolve bare invocation.

#### Scenario: Launch normal AddOne
- **WHEN** the user runs `a1` without a subcommand
- **THEN** AddOne SHALL launch one transparent full-viewport Pi process using the normal AddOne profile

#### Scenario: Launch vanilla Pi baseline
- **WHEN** the user runs `a1 pi`
- **THEN** AddOne SHALL launch one transparent full-viewport Pi process using Pi's ordinary user profile

#### Scenario: Launch sandbox profile
- **WHEN** the user runs `a1 sandbox`
- **THEN** AddOne SHALL launch one transparent full-viewport Pi process using the isolated AddOne sandbox profile

#### Scenario: Removed full-name executable is inspected
- **WHEN** npm installs the official AddOne package
- **THEN** the installation SHALL NOT create an `addone` executable

#### Scenario: Agent alias is requested
- **WHEN** the user runs `a1 agent`
- **THEN** AddOne SHALL reject the unknown subcommand, explain that bare `a1` is the agent experience, and display concise usage without launching Pi

#### Scenario: Multi-agent UX is introduced later
- **WHEN** a separately approved multi-agent change replaces the initial single-foreground AddOne presentation
- **THEN** bare `a1` SHALL remain the entry point and `a1 pi` plus `a1 sandbox` SHALL retain their explicit baseline/profile meanings
