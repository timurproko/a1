# Spec Delta

## ADDED Requirements

### Requirement: Resident attach only reads the profile settings document
The attach client SHALL treat the profile settings document it is given as a file it only reads. It SHALL start whether or not that document exists and SHALL NOT create, replace, or change it.

#### Scenario: Start with an existing settings document
- **WHEN** bare `a1` starts the attach client for a profile whose settings document exists
- **THEN** the attach client SHALL start, read the time format from that document, and leave it a regular file

#### Scenario: Start without a settings document
- **WHEN** bare `a1` starts the attach client for a profile with no settings document
- **THEN** the attach client SHALL start with the default time format and SHALL NOT create anything at the settings path
