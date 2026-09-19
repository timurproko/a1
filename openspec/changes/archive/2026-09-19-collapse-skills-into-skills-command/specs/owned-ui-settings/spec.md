## ADDED Requirements

### Requirement: The skills presentation setting is an Agent-section owned choice
Bare A1 SHALL expose the persisted A1 setting `skillsPresentation`, labeled `Skills`, exactly once in the owned settings screen's existing `Agent` section, immediately after `Prompt suggestions` and after every engine-provided Agent entry. Its allowed values SHALL be `collapse` and `expand`, its default SHALL be `collapse`, and its application boundary SHALL be `live`. Its description SHALL state that `collapse` offers one `/skills` command with a searchable dialog and the `/skills:` shortcut while `expand` lists every `/skill:<name>` command directly. The setting SHALL keep its A1-owned backend, persistence key, and profile-local storage; it SHALL NOT be written to Pi settings storage or presented as an engine descriptor. Introducing it SHALL advance the stored settings version with a forward migration that leaves existing values unchanged, so a profile without the key resolves to `collapse`.

The screen SHALL still contain only one Agent section, preserving the relative order and capability filtering of engine-provided settings and the existing `Prompt suggestions` control. The owned control SHALL remain visible and editable when engine settings are absent, unreadable, or not writable. Other A1 controls and the `a1 pi` comparison SHALL retain their existing grouping and behavior.

#### Scenario: Present the Agent section with both owned controls
- **WHEN** bare A1 opens settings with presentable engine settings
- **THEN** one Agent section SHALL contain those engine settings in their existing relative order, then `Prompt suggestions`, then `Skills`
- **AND** no second Agent section, duplicate control, or empty A1 section SHALL be rendered

#### Scenario: Resolve the default
- **WHEN** a profile stores no `skillsPresentation` value, including a profile written before the setting existed
- **THEN** the setting SHALL resolve to `collapse` after migration without rewriting any other stored value

#### Scenario: Change the presentation
- **WHEN** the user changes `Skills` between `collapse` and `expand`
- **THEN** the value SHALL be written to the A1 settings document and applied live to the running session
- **AND** no engine-setting write or Pi settings-file mutation SHALL occur

#### Scenario: Engine settings cannot be presented
- **WHEN** the engine is absent, reading its settings fails, it advertises no setting-write capability, or it supplies no presentable settings
- **THEN** `Skills` SHALL remain visible and editable in the single Agent section through its A1 backend
- **AND** section-wide unavailable or read-only presentation SHALL NOT falsely disable the owned control

#### Scenario: Find and operate the control
- **WHEN** the user searches for `Agent` or `Skills`, jumps between sections, or changes the control using keyboard or pointer input
- **THEN** the settings surface SHALL address the same single entry with its existing backend, value, shared controls, and live behavior
