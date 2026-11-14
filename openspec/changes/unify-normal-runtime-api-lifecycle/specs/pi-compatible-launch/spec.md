## ADDED Requirements

### Requirement: Normal-product APIs do not depend on launch grammar

Ordinary normal-profile A1 and the packaged Pi-compatible normal-profile entry SHALL expose the same supported A1 runtime APIs and integration capabilities under equivalent settings and host context. The compatible entry SHALL NOT lose session color control, native terminal identity reporting, session/worktree context or other supported product APIs because it accepts Pi-compatible arguments. API clients SHALL use the existing public A1 control commands and response contracts for sessions started by either entry. This parity SHALL NOT require identical invocation grammars, new aliases, a companion or a second API implementation. The distinct comparison `a1 pi` profile and noninteractive commands SHALL retain their intentional exclusions and existing behavior.

#### Scenario: Address either normal-product session
- **WHEN** one supported session starts through ordinary A1 and another through the packaged compatible entry in equivalent supported contexts
- **THEN** public A1 API clients SHALL be able to address each session using the same supported selectors, commands, capability semantics, responses and errors
- **AND** each session SHALL retain its own runtime identity and existing profile, extension and worktree isolation

#### Scenario: Compatible startup loads asynchronous extensions
- **WHEN** a compatible invocation loads an asynchronous extension before its interactive session becomes usable
- **THEN** the session SHALL retain the normal product's API integration lifecycle and runtime identity
- **AND** terminal identity SHALL NOT be advertised as usable before its current color endpoint is ready

#### Scenario: Compatible parser receives ordinary command words as instructions
- **WHEN** an instruction in the compatible grammar contains words used by the ordinary A1 control CLI
- **THEN** compatible parsing SHALL preserve its existing literal instruction meaning rather than introduce a second API-command grammar
- **AND** external control through the public A1 command SHALL remain available for the resulting session

#### Scenario: Comparison and noninteractive commands remain distinct
- **WHEN** the user selects the actual comparison profile or runs help, version, catalog or another noninteractive command
- **THEN** compatible-launch API parity SHALL NOT enable a product endpoint or reporter that the selected operation does not support
- **AND** existing noninteractive side-effect restrictions SHALL remain in force
