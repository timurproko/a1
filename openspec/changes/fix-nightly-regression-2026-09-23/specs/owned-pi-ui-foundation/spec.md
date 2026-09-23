## ADDED Requirements

### Requirement: Repository discovery cancellation signals only a spawned child

Bare A1 SHALL cancel bounded branch and pull-request discovery without asking the operating system to signal a subprocess until that subprocess has reported a positive process identifier. Cancellation or timeout before spawn completes SHALL fail closed without signaling the caller's process group, and cancellation after spawn SHALL terminate only the owned child.

#### Scenario: Dispose while a repository probe is still spawning

- **GIVEN** repository metadata discovery has requested a branch or pull-request subprocess
- **AND** the subprocess has not reported a positive process identifier
- **WHEN** the engine session is disposed or its repository context is reset
- **THEN** cancellation SHALL NOT send a signal to process identifier zero or any unowned process group
- **AND** discovery SHALL settle without blocking disposal or failing the session

#### Scenario: Cancel after the repository probe has spawned

- **GIVEN** a repository metadata subprocess has reported a positive process identifier
- **WHEN** discovery is canceled or exceeds its bounded timeout
- **THEN** A1 SHALL signal only that owned child
- **AND** discovery SHALL return no branch or pull-request result
