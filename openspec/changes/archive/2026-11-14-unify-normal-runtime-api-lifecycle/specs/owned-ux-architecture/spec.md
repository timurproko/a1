## ADDED Requirements

### Requirement: Normal-product API integrations share one explicit runtime lifecycle

Normal-product API integration availability SHALL be selected from the supported product capability and host context, not the spelling of the executable or the launcher grammar. Both ordinary and packaged compatible normal-product sessions SHALL share one runtime identity and readiness, replacement and teardown contract across their supported API integrations. Asynchronous extension startup SHALL NOT cause those integrations to derive conflicting runtime identities from later environment changes. The shared contract SHALL preserve existing owner boundaries and SHALL NOT create duplicate endpoint publishers or a parallel compatible-only API lifecycle.

#### Scenario: One normal runtime exposes several integrations
- **WHEN** a normal-product runtime starts color control, supported native identity reporting and session/worktree context through either launcher
- **THEN** the integrations SHALL refer to the same process runtime identity and current session binding
- **AND** a launcher-specific service SHALL NOT advertise a second identity or duplicate endpoint

#### Scenario: Runtime context survives asynchronous startup
- **WHEN** startup awaits extension work before the product APIs become available
- **THEN** those APIs SHALL retain the originating runtime identity and supported product capability selection
- **AND** a later inherited or changed environment value SHALL NOT substitute another runtime's identity

#### Scenario: Replacement or disposal invalidates integration work
- **WHEN** the current session binding changes or the runtime is disposed
- **THEN** pending integration work SHALL obey that same binding change or cancellation lifetime
- **AND** no delayed publisher SHALL advertise a superseded binding or revive a stopped runtime
