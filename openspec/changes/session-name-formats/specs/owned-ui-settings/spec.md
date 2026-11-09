## ADDED Requirements

### Requirement: Automatic session-name format is an owned live choice

Bare A1 SHALL expose the live **Session name format** Agent setting beside **Automatic session name**, with exactly Kebab case, Sentence case, and Title Case choices. Its owned `sessionNameFormat` value SHALL be `kebab` (default), `sentence`, or `title`, persisted through the existing profile settings manager.

#### Scenario: Choose a readable format
- **WHEN** a user selects Sentence case or Title Case and restarts with the same profile
- **THEN** the selected format SHALL remain effective and appear as the current choice

#### Scenario: Keep or recover the default
- **WHEN** the format setting is missing or invalid
- **THEN** automatic naming SHALL use Kebab case and expose all three valid choices

#### Scenario: Change the format of future names
- **WHEN** a user changes the format while a session already has a name
- **THEN** its existing name SHALL remain unchanged and no naming request SHALL start solely because of that setting change
- **AND** the next eligible generation or regeneration SHALL use the chosen format
