## MODIFIED Requirements

### Requirement: A1 supports only product and Pi-comparison profiles
Bare `a1` SHALL launch the product profile. A prerelease `a1 pi` SHALL launch the Pi comparison. No other interactive profile SHALL be declared, reserved, initialized, persisted as a current value, or documented.

#### Scenario: Product launch
- **WHEN** the user runs bare `a1`
- **THEN** A1 SHALL use `<home>/.a1/agent` and enable product surfaces

#### Scenario: Pi comparison launch
- **WHEN** the user runs `a1 pi` in a prerelease build
- **THEN** A1 SHALL preserve Pi's ordinary profile resolution and withhold product surfaces

#### Scenario: Unknown word
- **WHEN** the user supplies a word outside the command grammar
- **THEN** generic unknown-command handling SHALL return without starting the interactive runtime
