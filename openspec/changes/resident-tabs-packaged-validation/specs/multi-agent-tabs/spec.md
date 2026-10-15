## ADDED Requirements

### Requirement: Resident routing requires an interactive terminal
A bare or session-selected A1 launch SHALL take the resident route only when its standard input and standard output are both terminals. Otherwise it SHALL run the direct owned UI with the resident fallback reason `no interactive terminal`, and SHALL neither probe nor start the resident host.

#### Scenario: Piped launch with a packaged terminal host
- **WHEN** a package that carries the terminal host is launched with piped standard input or output
- **THEN** the launch SHALL run the direct owned UI and SHALL NOT start the attach client or contact the resident host

#### Scenario: Interactive launch
- **WHEN** the same package is launched from a terminal on a supported platform
- **THEN** resident routing SHALL proceed as before
