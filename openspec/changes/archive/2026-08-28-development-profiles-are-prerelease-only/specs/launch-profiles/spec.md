## MODIFIED Requirements

### Requirement: The Pi comparison is prerelease-only
The `a1` binary SHALL expose bare invocation as the product launch. The `pi` launch without package arguments SHALL be a development comparison available only in prerelease builds. Release builds SHALL omit it from usage and treat it as an unknown subcommand. Repository development SHALL continue to offer `npm start:pi` directly.

#### Scenario: Prerelease comparison
- **WHEN** the user runs `a1 pi` in a prerelease build
- **THEN** A1 SHALL present pinned Pi's interface through the owned rendering pipeline with product surfaces withheld

#### Scenario: Release comparison
- **WHEN** the user runs `a1 pi` in a release build
- **THEN** A1 SHALL report an unknown command without launching an interactive runtime

#### Scenario: Repository comparison
- **WHEN** a contributor runs `npm start:pi`
- **THEN** the development launcher SHALL prepare and start the comparison directly
