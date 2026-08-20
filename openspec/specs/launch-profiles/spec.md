# Launch Profiles Specification

## Purpose

Defines the stable A1 command grammar and isolated Pi profile roots used for normal A1, direct vanilla Pi comparison, and experimental sandbox resources.
## Requirements
### Requirement: A1 exposes exactly three interactive launch forms
The `a1` binary SHALL be the sole installed public command. Bare invocation SHALL be the A1 agent product surface and initially launch the normal single-foreground A1 profile, the `pi` subcommand SHALL launch the vanilla Pi baseline, and the `sandbox` subcommand SHALL launch the isolated sandbox profile. A1 SHALL NOT install an `addone` executable or expose an `agent` subcommand alias; future multi-agent UX SHALL evolve bare invocation.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch one transparent full-viewport Pi process using the normal A1 profile

#### Scenario: Launch vanilla Pi baseline
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL launch one transparent full-viewport Pi process using Pi's ordinary user profile

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
- **THEN** bare `a1` SHALL remain the entry point and `a1 pi` plus `a1 sandbox` SHALL retain their explicit baseline/profile meanings

### Requirement: Launch profiles use explicit user roots
The normal A1 profile SHALL use `<home>/.a1/agent`, the sandbox profile SHALL use `<home>/.a1/sandbox`, and the vanilla Pi profile SHALL preserve Pi's ordinary `<home>/.pi/agent` behavior. Path resolution SHALL use the effective user home consistently across Windows, macOS, and Linux and SHALL remain overrideable in hermetic tests.

#### Scenario: Bare A1 resolves its profile
- **WHEN** A1 launches with user home `H`
- **THEN** the child Pi process SHALL use `H/.a1/agent` as its Pi configuration root

#### Scenario: Sandbox resolves its profile
- **WHEN** sandbox launches with user home `H`
- **THEN** the child Pi process SHALL use `H/.a1/sandbox` as its Pi configuration root

#### Scenario: Vanilla baseline resolves its profile
- **WHEN** the Pi baseline launches with user home `H`
- **THEN** A1 SHALL leave Pi's configuration-root override unset so Pi resolves its ordinary `H/.pi/agent` profile

### Requirement: Profile selection isolates settings and resources
Normal A1, vanilla Pi, and sandbox SHALL resolve settings, authentication, sessions, extensions, skills, prompts, themes, packages, trust state, and other Pi-owned profile data only from the selected profile root, except for environment-provided provider credentials that Pi ordinarily supports. A1 SHALL NOT merge profile directories or silently fall back from an A1 profile to the vanilla Pi profile.

#### Scenario: Sandbox extension exists
- **WHEN** an extension is present under `<home>/.a1/sandbox/extensions` but absent from the other profiles
- **THEN** `a1 sandbox` SHALL make it discoverable while bare `a1` and `a1 pi` SHALL not load it from that location

#### Scenario: Normal A1 settings exist
- **WHEN** `<home>/.a1/agent/settings.json` differs from `<home>/.pi/agent/settings.json`
- **THEN** bare `a1` SHALL use the A1 settings and `a1 pi` SHALL use the ordinary Pi settings

#### Scenario: Selected A1 profile lacks credentials
- **WHEN** the selected A1 profile has no Pi authentication state and no supported provider credential is available from the environment
- **THEN** Pi SHALL present its normal authentication flow without A1 copying credentials from another profile

### Requirement: A1 never mutates another launch profile implicitly
A1 MAY create the selected `.a1` profile root and required empty directories when absent, but SHALL NOT copy, hard-link, symlink, merge, rewrite, or delete files from `.pi/agent`, another `.a1` profile, or an existing selected profile unless the user invokes a future explicit management operation. Existing profile content SHALL remain user-owned.

#### Scenario: First sandbox launch
- **WHEN** `<home>/.a1/sandbox` does not exist
- **THEN** A1 SHALL create only the minimum selected profile structure needed for Pi startup and SHALL leave `<home>/.pi/agent` and `<home>/.a1/agent` unchanged

#### Scenario: Existing sandbox content is present
- **WHEN** the sandbox root already contains settings, authentication, extensions, or sessions
- **THEN** A1 SHALL preserve those files and launch Pi against them without replacing them with defaults from another profile

### Requirement: Sandbox naming does not imply operating-system isolation
The `sandbox` profile SHALL mean isolated Pi configuration, resources, authentication state, and sessions. A1 SHALL NOT claim filesystem, process, network, credential, container, or operating-system security isolation from the sandbox name alone.

#### Scenario: User launches sandbox
- **WHEN** the user runs `a1 sandbox`
- **THEN** documentation and diagnostics SHALL describe it as an isolated Pi profile and SHALL NOT represent it as a security boundary

### Requirement: All launch forms preserve transparent terminal ownership
Normal A1, vanilla Pi, and sandbox SHALL use the accepted transparent direct-attachment path. Profile selection SHALL change launch configuration only and SHALL NOT add a PTY, terminal emulator, input translator, output parser, renderer, relay, or application-specific terminal behavior.

#### Scenario: Compare profile terminal paths
- **WHEN** any of the three launch forms hands off to Pi
- **THEN** Pi and the physical terminal SHALL retain ordinary rendering/input ownership and A1 SHALL retain only foreground lease and lifecycle ownership

### Requirement: Maintenance commands remain unambiguous
`version`, `update`, and `update:next` SHALL retain their existing non-interactive meanings and SHALL NOT be interpreted as Pi profile names or forwarded to Pi. Unknown A1 subcommands SHALL fail before supervisor or foreground-child startup.

#### Scenario: Query version
- **WHEN** the user runs `a1 version`
- **THEN** A1 SHALL execute the dependency-light version query without launching any interactive profile

#### Scenario: Unknown subcommand
- **WHEN** the user provides a subcommand other than `pi`, `sandbox`, `version`, `update`, or `update:next`
- **THEN** A1 SHALL exit with a usage error without invoking a shell or child Pi process

