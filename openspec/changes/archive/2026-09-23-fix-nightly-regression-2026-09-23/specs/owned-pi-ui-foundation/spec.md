## ADDED Requirements

### Requirement: Repository discovery rejects missing contexts before subprocess launch

Bare A1 SHALL verify that the selected repository directory exists before launching Git branch or GitHub pull-request discovery. A missing directory SHALL fail closed without creating or signaling a child process, blocking disposal, or failing the session.

#### Scenario: Dispose after selecting a missing repository context

- **GIVEN** repository metadata discovery selected a directory that does not exist on the current platform
- **WHEN** discovery starts and the engine session is immediately disposed
- **THEN** A1 SHALL NOT launch a branch or pull-request subprocess for that directory
- **AND** disposal SHALL NOT signal the caller's process group or fail the session

#### Scenario: Discover metadata for an existing repository context

- **GIVEN** the selected repository directory exists
- **WHEN** repository metadata discovery starts
- **THEN** A1 SHALL retain its bounded asynchronous branch and pull-request probes
- **AND** cancellation, timeout, command failure, or invalid output SHALL return no repository metadata
