## MODIFIED Requirements

### Requirement: Agent behavior settings reach the active Pi session
A1 SHALL apply `autoCompact`, `autoResizeImages`, `blockImages`, `enableSkillCommands`, `steeringMode`, `followUpMode`, `transport`, `httpIdleTimeoutMs`, `autoRetry`, `retryMaxRetries`, `thinkingLevel`, and `warnings` with pinned Pi semantics. `autoRetry` SHALL persist Pi's `retry.enabled`; `retryMaxRetries` SHALL persist Pi's `retry.maxRetries` as an integer from 1 through 10, defaulting to 3. Settings that Pi can change during a session SHALL affect subsequent applicable work in that session; startup defaults SHALL remain authoritative for newly created sessions. HTTP idle timeout changes SHALL cover the same provider stream and dispatcher idle behavior as pinned Pi, including the documented disabled value. Agent-level retry changes SHALL govern later retry eligibility decisions for ordinary turns and Pi operations that share that budget without restarting an already scheduled delay, changing the exponential-backoff formula, or enabling provider-level retries. Warning parts SHALL govern only their corresponding warning.

#### Scenario: Change active queue behavior
- **WHEN** the user changes steering mode or follow-up mode while a session is active
- **THEN** subsequently queued input SHALL use the new mode without recreating the session

#### Scenario: Change active transport
- **WHEN** the user changes transport while a session is active
- **THEN** the next provider request SHALL use the selected transport as pinned Pi does

#### Scenario: Change skill-command registration
- **WHEN** the user enables or disables skill commands
- **THEN** command discovery and autocomplete SHALL refresh in the running shell without requiring `/reload` or restart

#### Scenario: Change image processing policy
- **WHEN** the user changes auto-resize or block-images policy
- **THEN** the next user or tool image sent toward a provider SHALL follow the new policy

#### Scenario: Change the HTTP idle timeout
- **WHEN** the user changes the HTTP idle timeout
- **THEN** subsequent provider traffic SHALL use the new stream and dispatcher idle timeout, with zero retaining pinned Pi's disabled-timeout meaning

#### Scenario: Change the agent retry switch
- **WHEN** the user disables automatic retries while the session is active
- **THEN** a later retryable provider failure SHALL settle without scheduling an agent-level retry
- **AND** provider-level retry configuration SHALL remain unchanged

#### Scenario: Change the agent retry limit
- **WHEN** the user changes the retry limit to an allowed value while the session is active
- **THEN** the next agent-level retry eligibility decision SHALL use that value
- **AND** a delay already scheduled before the change SHALL retain its original duration
- **AND** Pi's existing exponential-backoff formula and maximum agent delay SHALL remain unchanged

#### Scenario: Persist one nested retry field
- **WHEN** A1 writes either agent-level retry setting
- **THEN** Pi's public settings manager SHALL persist and flush that nested field
- **AND** it SHALL preserve the other agent-level field, delay fields, provider-level retry fields, and unrelated Pi settings

#### Scenario: Change active thinking
- **WHEN** the user changes thinking level for a model that supports the selected level
- **THEN** the active session and every thinking-level indicator SHALL immediately use the selected level
- **AND** the persisted default SHALL initialize later fresh sessions

#### Scenario: Disable one warning
- **WHEN** the user disables a declared warning part
- **THEN** that warning SHALL no longer be presented while unrelated warnings remain governed by their own values
