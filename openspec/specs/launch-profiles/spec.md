# Launch Profiles Specification

## Purpose

Defines the A1 command grammar and the separate profile roots used by normal A1 and the prerelease Pi comparison.

## Requirements

### Requirement: A1 exposes one product launch and one prerelease comparison launch
The `a1` binary SHALL be the sole installed public command. Bare invocation SHALL launch the A1 agent product surface. A prerelease build SHALL additionally expose `a1 pi` as a development comparison against the pinned Pi interface. A release build SHALL not expose the comparison launch. A1 SHALL NOT install an `addone` executable or expose an `agent` subcommand alias.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch the owned UI using the normal A1 profile

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs `a1 pi` from a prerelease build
- **THEN** A1 SHALL launch the shared owned rendering pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected

#### Scenario: Multi-agent UX is introduced later
- **WHEN** a separately approved multi-agent change replaces the initial presentation
- **THEN** bare `a1` SHALL remain the product entry point and the prerelease Pi comparison SHALL retain its explicit meaning

### Requirement: Launch profiles use separate user roots
The normal A1 profile SHALL use `<home>/.a1/agent`. The Pi comparison SHALL leave Pi's configuration-root override unset so Pi preserves its ordinary `<home>/.pi/agent` behavior. Path resolution SHALL use the effective user home consistently and remain overrideable in hermetic tests.

#### Scenario: Bare A1 resolves its profile
- **WHEN** A1 launches with user home `H`
- **THEN** the pinned Pi engine SHALL use `H/.a1/agent` as its configuration root

#### Scenario: Pi comparison resolves its profile
- **WHEN** the comparison launches with user home `H`
- **THEN** A1 SHALL leave the configuration-root override unset so Pi resolves `H/.pi/agent`

### Requirement: Profile selection isolates settings and resources
Normal A1 and the Pi comparison SHALL resolve settings, authentication, sessions, extensions, skills, prompts, themes, packages, trust state, and other Pi-owned profile data only from the selected profile root, except for supported environment credentials. A1 SHALL NOT merge profile directories or silently fall back from its profile to Pi's profile.

#### Scenario: Normal A1 settings exist
- **WHEN** `<home>/.a1/agent/settings.json` differs from `<home>/.pi/agent/settings.json`
- **THEN** bare `a1` SHALL use the A1 settings and `a1 pi` SHALL use the ordinary Pi settings

#### Scenario: A1 lacks credentials
- **WHEN** the A1 profile has no authentication state and no supported provider credential is available
- **THEN** the engine SHALL present its normal authentication flow without copying credentials from Pi's profile

### Requirement: A1 never mutates another launch profile implicitly
A1 MAY create its `.a1/agent` profile root and required empty directories when absent, but SHALL NOT copy, link, merge, rewrite, or delete files from `.pi/agent` or an existing profile unless the user invokes an explicit management operation.

#### Scenario: First A1 launch
- **WHEN** `<home>/.a1/agent` does not exist
- **THEN** A1 SHALL create only the minimum profile structure and leave `<home>/.pi/agent` unchanged

### Requirement: Both launch forms use one rendering pipeline
Normal A1 and the Pi comparison SHALL use the A1-owned rendering and input pipeline. Profile selection SHALL change configuration and product-surface availability, not introduce a PTY, terminal parser, byte relay, or child terminal renderer.

#### Scenario: Compare terminal paths
- **WHEN** either launch form starts
- **THEN** it SHALL use the same owned runtime composition and launch-instance containment

### Requirement: Maintenance commands remain unambiguous
`--help`, `-h`, `--version`, `-v`, `update`, and the declared operations under
`a1 pi` SHALL retain their maintenance meanings and SHALL NOT be interpreted as
profile names or forwarded into an interactive runtime. `a1 update --develop` MAY
carry one numbered or full-version preview selector. A prerelease build SHALL expose
bare `a1 pi` as its comparison launch; a release build SHALL treat that launch form
as unsupported.

An unsupported command or operation SHALL exit successfully without output before
supervisor, foreground-child, shell, or operation startup. A malformed invocation
of a recognized maintenance command SHALL fail before startup with focused command
guidance and without automatically printing the complete help.

#### Scenario: Query help
- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** A1 SHALL print help without launching any profile

#### Scenario: Query version
- **WHEN** the user runs `a1 --version` or `a1 -v`
- **THEN** A1 SHALL execute the dependency-light version query without launching any profile

#### Scenario: Manage packages
- **WHEN** the user runs `a1 pi install`, `a1 pi remove`, `a1 pi uninstall`, `a1 pi list`, or an accepted package update form
- **THEN** A1 SHALL run the package operation against the A1 profile without launching any interactive profile

#### Scenario: Launch form is given an argument
- **WHEN** an interactive launch form is followed by an argument outside the declared maintenance grammar
- **THEN** A1 SHALL return successfully and silently without launching a profile

#### Scenario: Unknown subcommand
- **WHEN** the user provides a word outside the declared grammar
- **THEN** A1 SHALL return successfully and silently without invoking a shell or child process

#### Scenario: Comparison launch is absent from a release
- **WHEN** the user runs bare `a1 pi` from a stable release build
- **THEN** A1 SHALL return successfully and silently without launching a profile

#### Scenario: Removed update command is provided
- **WHEN** the user provides a command beginning `update:`
- **THEN** A1 SHALL return successfully and silently without update or runtime work

### Requirement: Interactive launch forms are concurrently independent
A1 SHALL permit multiple simultaneous instances of bare `a1`, prerelease `a1 pi`, or both. Profile selection, profile data, lifecycle state, process containment, and closure SHALL remain scoped to the originating invocation rather than a product-wide foreground slot.

#### Scenario: Start the same profile twice
- **WHEN** the user starts two instances of the same retained profile
- **THEN** both SHALL launch independently without sharing foreground ownership

#### Scenario: Start both profile forms
- **WHEN** owned A1 or Pi-comparison instances are already active and another supported form is launched
- **THEN** the new invocation SHALL start independently without requiring an existing instance to exit

### Requirement: Launch-instance ownership preserves the shared rendering pipeline
The launch-instance lifecycle SHALL change process ownership and cleanup only. Bare `a1` and prerelease `a1 pi` SHALL retain the shared A1-owned rendering and input pipeline declared by the canonical launch profile, differing only in configuration root and product-surface availability.

#### Scenario: Compare profile paths under launch-instance ownership
- **WHEN** the user launches bare `a1` alongside prerelease `a1 pi`
- **THEN** both SHALL use the shared owned pipeline inside independent process-containment boundaries
