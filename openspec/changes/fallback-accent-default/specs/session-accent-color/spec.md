## ADDED Requirements

### Requirement: Settings-less accent uses the declared default

When no settings are available, the session SHALL use the declared default of the accent colour setting rather than a separately chosen colour.

#### Scenario: No settings

- **WHEN** a session starts without a settings manager
- **THEN** its accent colour is the `accentColor` declaration's default, which is blue
