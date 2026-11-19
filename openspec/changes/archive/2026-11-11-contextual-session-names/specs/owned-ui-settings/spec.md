## MODIFIED Requirements

### Requirement: Automatic session-name format is an owned live choice

Bare A1 SHALL expose the live **Session name format** Agent setting beside **Automatic session name**, with exactly Sentence case, Kebab case, and Title Case choices in that order. Its owned `sessionNameFormat` value SHALL be `sentence` (default), `kebab`, or `title`, persisted through the existing profile settings manager. Valid explicit saved choices SHALL remain effective when the default changes.

#### Scenario: Choose a readable format
- **WHEN** a user selects Sentence case or Title Case and restarts with the same profile
- **THEN** the selected format SHALL remain effective and appear as the current choice

#### Scenario: Keep or recover the default
- **WHEN** the format setting is missing or invalid
- **THEN** automatic naming SHALL use Sentence case and expose all three valid choices with Sentence case first

#### Scenario: Preserve a saved alternative
- **WHEN** the profile contains a valid explicit Kebab case or Title Case preference
- **THEN** that preference SHALL remain effective without being replaced by the new default

#### Scenario: Change the format of future names
- **WHEN** a user changes the format while a session already has a name
- **THEN** its existing name SHALL remain unchanged and no naming request SHALL start solely because of that setting change
- **AND** the next eligible generation or regeneration SHALL use the chosen format
