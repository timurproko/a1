# owned-ui-settings Delta

## ADDED Requirements

### Requirement: The Settings tab serves Agent settings without an engine
In a resident Settings tab, the Agent section SHALL read and write Pi's settings through a settings port built from Pi's settings manager without a running engine or session. It SHALL list and edit the same Agent rows as a Settings screen backed by an engine, persist each change to the shared settings document, and list per-model thinking levels from a model catalog read offline from the profile. A setting's live effect SHALL belong to each Agent's own process, which rereads the shared settings document.

#### Scenario: Agent rows are complete
- **WHEN** the Settings tab shows its Agent section
- **THEN** every Agent setting that an engine-backed Settings screen lists SHALL be listed with its current value

#### Scenario: An Agent setting is saved
- **WHEN** the user changes an Agent setting in the Settings tab
- **THEN** the shared settings document SHALL hold the new value and a running Agent tab SHALL read it on its next reread

#### Scenario: Per-model thinking levels
- **WHEN** the user opens the per-model thinking levels dialog in the Settings tab
- **THEN** it SHALL list the profile's available models with their supported levels, read without network access
