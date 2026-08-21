## MODIFIED Requirements

### Requirement: A1 exposes exactly three interactive launch forms
The `a1` binary SHALL be the sole installed public command. Bare invocation SHALL be the A1-owned agent product surface, the `pi` subcommand SHALL launch the vanilla Pi baseline, and the `sandbox` subcommand SHALL launch the isolated sandbox profile. Every invocation SHALL create an independent launch instance. A1 SHALL NOT install an `addone` executable or expose an `agent` subcommand alias; future multi-agent UX SHALL evolve bare invocation.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch one fresh owned-UI instance using the normal A1 profile

#### Scenario: Launch vanilla Pi baseline
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL launch one transparent full-viewport Pi instance using Pi's ordinary user profile

#### Scenario: Launch sandbox profile
- **WHEN** the user runs `a1 sandbox`
- **THEN** A1 SHALL launch one transparent full-viewport Pi instance using the isolated A1 sandbox profile

#### Scenario: Removed full-name executable is inspected
- **WHEN** npm installs the official A1 package
- **THEN** the installation SHALL NOT create an `addone` executable

#### Scenario: Agent alias is requested
- **WHEN** the user runs `a1 agent`
- **THEN** A1 SHALL reject the unknown subcommand, explain that bare `a1` is the agent experience, and display concise usage without launching Pi

#### Scenario: Multi-agent UX is introduced later
- **WHEN** a separately approved multi-agent change replaces the initial single-agent A1 presentation
- **THEN** bare `a1` SHALL remain the entry point, its agents SHALL remain owned by that invocation unless an explicit resident capability is separately approved, and `a1 pi` plus `a1 sandbox` SHALL retain their explicit baseline/profile meanings

## REMOVED Requirements

### Requirement: All launch forms preserve transparent terminal ownership
**Reason**: Bare `a1` now uses the owned UI, while only `a1 pi` and `a1 sandbox` use transparent direct attachment; a single requirement claiming all forms are transparent is no longer accurate.

**Migration**: Preserve each profile's selected terminal path while applying the common launch-instance lifecycle defined below.

## ADDED Requirements

### Requirement: Interactive launch forms are concurrently independent
A1 SHALL permit multiple simultaneous instances of the same or different interactive launch forms. Profile selection, profile data, lifecycle state, process containment, and closure SHALL remain scoped to the originating invocation rather than a product-wide foreground slot.

#### Scenario: Start the same profile twice
- **WHEN** the user starts two `a1 sandbox` commands in different terminals
- **THEN** A1 SHALL launch both against the sandbox profile without treating either instance as the other's foreground owner

#### Scenario: Start all profile forms
- **WHEN** owned A1, vanilla Pi, and sandbox Pi instances are already active and another supported form is launched
- **THEN** the new invocation SHALL start independently without requiring an existing instance to exit

### Requirement: Every launch form preserves its declared terminal ownership
Bare `a1` SHALL retain the A1-owned UI terminal path. `a1 pi` and `a1 sandbox` SHALL retain accepted transparent direct attachment. The shared lifecycle layer SHALL change ownership and cleanup only and SHALL NOT add a PTY, terminal emulator, input translator, output parser, renderer, relay, or application-specific terminal behavior to any profile.

#### Scenario: Compare owned and transparent profile paths
- **WHEN** the user launches bare `a1` alongside `a1 pi` or `a1 sandbox`
- **THEN** each instance SHALL use its declared terminal path while sharing the same instance close and process-tree ownership contract
