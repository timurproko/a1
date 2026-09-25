## ADDED Requirements

### Requirement: The Agent section exposes bounded automatic retry controls
Bare A1's existing Agent settings section SHALL present Pi's agent-level `retry.enabled` and `retry.maxRetries` values exactly once as `Automatic retries` and `Retry limit`, in that order. Both entries SHALL use the engine settings backend and live application. `Automatic retries` SHALL be boolean and default to enabled. `Retry limit` SHALL be an integer from 1 through 10 inclusive, in steps of one, and default to 3. The retry limit SHALL remain visible and editable while automatic retries are disabled so a finite budget can be prepared before enabling it.

The entries SHALL show Pi's stored and effective values, persist through Pi's public settings manager, preserve unrelated Pi settings and nested retry fields on write, and SHALL NOT create A1-owned duplicates or write the A1 settings document. Generated engine wording and order SHALL remain the presentation authority. Bare A1 SHALL not expose the provider-level retry count, base delay, or maximum agent delay through these controls. The `a1 pi` comparison profile SHALL retain the selected pinned Pi settings surface without an A1-inserted duplicate.

#### Scenario: Open settings with retry defaults
- **WHEN** the active Pi profile stores no agent-level retry values and bare A1 opens settings
- **THEN** the Agent section SHALL show `Automatic retries` enabled and `Retry limit` set to 3
- **AND** each control SHALL appear exactly once using the Agent backend

#### Scenario: Increase the finite retry limit
- **WHEN** the user changes `Retry limit` from 3 to 10
- **THEN** the value SHALL be validated, persisted through the engine settings port, and applied before success is reported
- **AND** subsequent eligible provider work in the running session SHALL use a maximum of 10 automatic retries

#### Scenario: Disable automatic retries
- **WHEN** the user disables `Automatic retries`
- **THEN** subsequent retryable failures SHALL not start an agent-level automatic retry
- **AND** the stored retry limit SHALL remain visible and unchanged

#### Scenario: Reject a limit outside the offered range
- **WHEN** a settings write attempts a retry limit below 1, above 10, or not an integer
- **THEN** the engine settings port SHALL reject the write
- **AND** the prior stored and effective retry state SHALL remain consistent

#### Scenario: Read an invalid stored retry limit
- **WHEN** the Pi profile contains a retry limit below 1, above 10, or not an integer
- **THEN** the effective retry limit SHALL resolve to 3 and the condition SHALL be reported once
- **AND** opening settings SHALL preserve the stored file until the user explicitly accepts a valid change

#### Scenario: Preserve nested retry settings
- **WHEN** the active Pi settings document contains retry delay or provider-level retry fields and either exposed control is changed
- **THEN** only the selected agent-level field SHALL change
- **AND** every unrelated retry field and unrelated Pi setting SHALL be preserved

#### Scenario: Pi settings cannot provide the controls
- **WHEN** the active engine lacks the public write, flush, or live-effect contract required by either retry entry
- **THEN** bare A1 SHALL omit the unsupported entry rather than write Pi storage directly or present a no-op

#### Scenario: Inspect comparison settings
- **WHEN** the reader opens settings in `a1 pi`
- **THEN** the comparison profile SHALL follow the selected pinned Pi settings presentation
- **AND** A1 SHALL not insert a second automatic-retry switch or retry-limit control
