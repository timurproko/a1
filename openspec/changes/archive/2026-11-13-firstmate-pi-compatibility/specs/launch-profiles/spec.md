## MODIFIED Requirements

### Requirement: A1 exposes one single-agent launch and one prerelease comparison launch
The `a1` binary SHALL remain the ordinary installed public command. Bare invocation SHALL launch the A1 single-agent product surface directly. A prerelease build SHALL additionally expose `a1 pi` as a development comparison against the pinned Pi interface. A release build SHALL not expose the comparison launch. A1 MAY additionally ship a separately named Pi-compatible normal-product entry and an opt-in pi shim directory, but SHALL NOT globally register pi or expose `agent`, `solo`, `ui`, or `tabs` subcommands.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch the owned single-agent UI using the normal A1 profile

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs `a1 pi` from a prerelease build
- **THEN** A1 SHALL launch the shared owned rendering pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected

#### Scenario: A removed launch word is given
- **WHEN** the user runs `a1 solo` or `a1 tabs`
- **THEN** A1 SHALL return quietly without launching a profile

#### Scenario: Compatibility launch preserves the product
- **WHEN** Firstmate resolves the opt-in A1-compatible pi executable
- **THEN** it SHALL launch normal A1 rather than the Pi comparison and retain normal A1 settings, history and features
