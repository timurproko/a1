## ADDED Requirements

### Requirement: Default model changes apply only to later sessions

A1 SHALL expose Pi's persisted default provider/model pair as the Agent `defaultModel` setting with `next-session` application. Reading the setting SHALL return the canonical `provider/modelId` reference stored by Pi. Available values SHALL be resolved from the authenticated runtime model catalog, and a write SHALL accept only an exact available reference, splitting the provider from a model identifier that may itself contain additional slashes.

Accepting `defaultModel` SHALL persist both provider and model through Pi's settings manager and SHALL NOT call the active session's model setter, change active-model view state, change the current thinking level, or change model cycling scope. A subsequently created session SHALL start on the authenticated persisted default even when that model is outside `enabledModels`; the session's cycling scope SHALL remain the models resolved from `enabledModels`. The provisional footer shown while that fresh Agent starts SHALL use the persisted default model instead of the previous Agent's active model, so the first authoritative session frame does not replace a stale model label. Persistence failure SHALL restore and report one consistent prior stored/effective value.

#### Scenario: Read the default model setting

- **WHEN** Pi has a persisted default provider and model
- **THEN** the Agent settings port SHALL report them as one canonical `provider/modelId` value
- **AND** its offered choices SHALL contain only authenticated models available from the runtime catalog

#### Scenario: Persist a default for later sessions

- **WHEN** the user writes an exact available model reference to `defaultModel`
- **THEN** Pi's default provider and model settings SHALL be persisted together
- **AND** the operation SHALL report `next-session` application
- **AND** a later fresh session SHALL start on that saved model even when it is outside `enabledModels`
- **AND** the later session's cycling scope SHALL remain unchanged

#### Scenario: Preview the default while a fresh Agent starts

- **WHEN** the user opens a fresh Agent after persisting a different default model
- **THEN** the provisional Agent footer SHALL immediately show the persisted default model
- **AND** the first authoritative session frame SHALL retain that model label instead of replacing the previous Agent's model

#### Scenario: Preserve the active session

- **WHEN** `defaultModel` changes while a session is active
- **THEN** the session's current model, active-model view, current thinking level, and cycling scope SHALL remain unchanged

#### Scenario: Reject an unavailable default

- **WHEN** a `defaultModel` write does not exactly identify an authenticated model in the current catalog
- **THEN** the write SHALL fail without changing either persisted default field or the active session

#### Scenario: Default-model persistence fails

- **WHEN** Pi cannot durably persist a valid `defaultModel` write
- **THEN** the settings operation SHALL report failure
- **AND** the prior default provider/model pair SHALL remain the authoritative stored and effective value
