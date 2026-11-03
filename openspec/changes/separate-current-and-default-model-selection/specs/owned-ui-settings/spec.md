## ADDED Requirements

### Requirement: The default model has a dedicated Settings configurator

The owned Settings screen SHALL expose Pi's persisted default provider/model pair as one writable Agent entry labeled `Default model`. The entry SHALL display `configure` rather than treating the model catalog as a scalar value menu. It SHALL declare `next-session` application and SHALL use Pi's existing default-model settings fields as its sole persistence authority.

Activating `Default model` SHALL open a keyboard-only searchable selector using the authenticated models supplied by the Agent setting descriptor. The selector SHALL use the owned modal hierarchy, an accent title `Default Model`, a muted instruction `Select the model used for new sessions`, a focused search input with the exact ASCII `> ` prompt marker, provider-suffixed model rows, and shortcut guidance for typing, Up/Down navigation, Enter selection, and Escape close. Search SHALL match model identifier, display name, provider, and full `provider/modelId` reference. The persisted default SHALL be the initial selection when it remains available and SHALL have one distinct persisted-default marker independent of the active session model.

Enter SHALL write the selected full model reference through the Agent settings backend and return to the Settings list only after the write succeeds. The write SHALL update Pi's persisted default provider/model pair without changing the active session model, active model indicator, current thinking level, or model cycling scope. Escape SHALL close without writing. If the write fails or becomes unavailable, the selector SHALL remain open with its query and selection preserved, the previous default SHALL remain authoritative, and the Settings failure channel SHALL report the error.

The pinned `a1 pi` comparison profile SHALL retain its existing model selector and select-as-default interaction without receiving the owned Settings configurator.

#### Scenario: Inspect the Agent Settings section

- **WHEN** bare A1 opens the owned Settings screen with authenticated models available
- **THEN** the Agent section SHALL contain one `Default model` entry whose value reads `configure`
- **AND** the entry SHALL be backed by Pi's persisted default provider/model pair and declare `next-session` application

#### Scenario: Open default-model configuration

- **WHEN** the user activates `Default model`
- **THEN** the dialog SHALL show `Default Model`, the muted instruction `Select the model used for new sessions`, a focused search input beginning with ASCII `> `, and descriptor-supplied model rows
- **AND** the persisted default SHALL be selected and marked when it is available
- **AND** the active session model SHALL NOT be used as the default marker when it differs

#### Scenario: Filter default models

- **WHEN** the user types a query in the default-model selector
- **THEN** only models matching identifier, display name, provider, or full reference SHALL remain
- **AND** Up/Down navigation and the selected row SHALL remain bounded to the filtered results

#### Scenario: Save a different default model

- **WHEN** the user selects a different available model and the settings write succeeds
- **THEN** Pi's persisted default provider/model pair SHALL change to that model
- **AND** the selector SHALL return to the Settings list
- **AND** the active session model, thinking level, and cycling scope SHALL remain unchanged

#### Scenario: Close without changing the default

- **WHEN** the user presses Escape in the default-model selector
- **THEN** the selector SHALL close without writing
- **AND** the previous persisted default SHALL remain unchanged

#### Scenario: Default-model persistence fails

- **WHEN** the user selects a model and the settings write fails or is unavailable
- **THEN** the selector SHALL remain open with the same query and selected model
- **AND** the previous persisted default SHALL remain authoritative
- **AND** the failure SHALL be reported through the Settings failure channel

#### Scenario: Keep comparison model selection unchanged

- **WHEN** the user runs the `a1 pi` comparison profile
- **THEN** its pinned model selector SHALL retain its existing current-model and select-as-default actions
- **AND** the owned `Default model` Settings configurator SHALL NOT replace or modify that selector
