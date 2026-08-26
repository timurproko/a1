## MODIFIED Requirements

### Requirement: A1 exposes product and Pi-comparison launch forms
Bare `a1` SHALL launch the product surface and prerelease `a1 pi` SHALL launch the comparison surface. Every invocation SHALL create an independent launch instance.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch one fresh owned-UI instance using the normal A1 profile

#### Scenario: Launch vanilla Pi baseline
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL launch one transparent full-viewport Pi instance using Pi's ordinary user profile


#### Scenario: Removed full-name executable is inspected
- **WHEN** npm installs the official A1 package
- **THEN** the installation SHALL NOT create an `addone` executable

#### Scenario: Agent alias is requested
- **WHEN** the user runs `a1 agent`
- **THEN** A1 SHALL reject the unknown subcommand, explain that bare `a1` is the agent experience, and display concise usage without launching Pi

#### Scenario: Multi-agent UX is introduced later
- **WHEN** a separately approved multi-agent change replaces the initial single-agent A1 presentation
- **THEN** bare `a1` SHALL remain the entry point, its agents SHALL remain owned by that invocation unless an explicit resident capability is separately approved, and `a1 pi` SHALL retain its explicit comparison meaning

## REMOVED Requirements

### Requirement: All launch forms preserve transparent terminal ownership
**Reason**: Bare `a1` now uses the owned UI, while only `a1 pi` use transparent direct attachment; a single requirement claiming all forms are transparent is no longer accurate.

**Migration**: Preserve each profile's selected terminal path while applying the common launch-instance lifecycle defined below.

## ADDED Requirements

### Requirement: Interactive launch forms are concurrently independent
A1 SHALL permit multiple simultaneous instances of the same or different interactive launch forms. Profile selection, profile data, lifecycle state, process containment, and closure SHALL remain scoped to the originating invocation rather than a product-wide foreground slot.

#### Scenario: Start the same profile twice
- **WHEN** the user starts two instances of the same retained profile
- **THEN** both SHALL launch independently without sharing foreground ownership

#### Scenario: Start all profile forms
- **WHEN** owned A1, vanilla Pi instances are already active and another supported form is launched
- **THEN** the new invocation SHALL start independently without requiring an existing instance to exit

### Requirement: Every launch form preserves its declared terminal ownership
Bare `a1` SHALL retain the A1-owned UI terminal path. `a1 pi` SHALL retain accepted transparent direct attachment. The shared lifecycle layer SHALL change ownership and cleanup only and SHALL NOT add a PTY, terminal emulator, input translator, output parser, renderer, relay, or application-specific terminal behavior to any profile.

#### Scenario: Compare owned and transparent profile paths
- **WHEN** the user launches bare `a1` alongside `a1 pi`
- **THEN** each instance SHALL use its declared terminal path while sharing the same instance close and process-tree ownership contract
