## MODIFIED Requirements

### Requirement: A changed setting applies to the running session
A1 SHALL apply a changed setting at the application boundary declared by its resolved entry and SHALL keep effective values consistent across every surface that reads them. Each setting SHALL declare one of `live`, `next-session`, `next-start`, or `current-exit`. A live setting SHALL take effect before the change reports success. A deferred setting SHALL state its boundary when changed rather than appearing live. A setting unavailable in the active product mode or environment SHALL be non-editable and state why. These rules SHALL apply equally to A1 settings and settings supplied through the engine settings port.

#### Scenario: Change a live-applicable setting
- **WHEN** the user accepts a change to a setting declared as `live`
- **THEN** the new value SHALL take effect in the running session before success is reported
- **AND** every surface reading that setting SHALL observe the same effective value

#### Scenario: Change a restart-required setting
- **WHEN** the user accepts a change declared as `next-session`, `next-start`, or `current-exit`
- **THEN** the value SHALL be stored, the surface SHALL state the exact application boundary, and the running owner SHALL retain the previous value until that boundary

#### Scenario: Setting is unavailable
- **WHEN** the active product mode or environment cannot provide a setting's effect
- **THEN** the entry SHALL state the reason, SHALL not be editable, and SHALL not accept a persisted no-op

#### Scenario: Applying a change fails
- **WHEN** storage accepts a value but its declared live effect fails
- **THEN** the screen SHALL report the failure, SHALL not claim the value is effective, and SHALL restore one consistent effective value

#### Scenario: Abandon a change
- **WHEN** the user cancels out of editing a setting before accepting it
- **THEN** no value SHALL be stored and the running session SHALL be unaffected

### Requirement: Resolved settings are offered to a surface as grouped sections
A1 SHALL expose the resolved settings as sections a consuming surface can present without knowing where a value is stored: the declared A1 settings in their own section, and the settings reported by the engine settings port under a distinct Agent section. Each entry SHALL carry its current stored value, current effective value when different, whether it can be changed from A1, its application boundary, its available choices where its source declares them, its description where its source provides one, and any product-mode or environment limitation. Agent settings SHALL be read, written, and applied only through the engine settings port; A1 SHALL NOT write Pi settings storage directly. Where the engine does not advertise settings write or effect capability, its entries SHALL be reported as not editable with a stated reason rather than appearing editable. A descriptor without an application contract SHALL not be promoted to a writable entry.

#### Scenario: Build sections with an attached engine
- **WHEN** sections are built while the engine reports its settings
- **THEN** the A1 section SHALL list every declared setting with its resolved value, choices, description, source, and application boundary
- **AND** the Agent section SHALL list every setting the engine reports with its stored and effective state, writability, application boundary, and limitation reason where applicable

#### Scenario: Change a setting in the A1 section
- **WHEN** a change is accepted for an entry in the A1 section
- **THEN** the value SHALL be written to the A1 settings document, applied at its declared boundary, and SHALL NOT be sent to the engine settings port

#### Scenario: Change a setting in the Agent section
- **WHEN** a change is accepted for an entry in the Agent section and the engine advertises the required write and effect capability
- **THEN** the value SHALL be written and applied through the engine settings port, flushed where the engine advertises flush capability, and SHALL NOT be written into the A1 settings document

#### Scenario: Engine advertises no settings write capability
- **WHEN** the engine settings port reports no write capability
- **THEN** every Agent entry SHALL be reported as not editable with a stated reason, and an attempted change SHALL be refused rather than silently dropped

#### Scenario: Engine advertises storage without an effect
- **WHEN** an engine descriptor can be persisted but has no application contract for the active mode
- **THEN** the Agent entry SHALL be reported as not editable with the missing-effect reason rather than presented as writable

#### Scenario: Agent settings cannot be read
- **WHEN** the engine settings port fails, reports no settings, or is absent
- **THEN** the A1 section SHALL still be complete and usable, the Agent section SHALL report why it is unavailable, and no stale or invented agent entry SHALL appear

#### Scenario: Report a failed change
- **WHEN** a change cannot be stored or cannot be applied through the engine
- **THEN** the failure SHALL be reported to the caller and the change SHALL NOT be reported as effective
