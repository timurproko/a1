## ADDED Requirements

### Requirement: A screen's hint line is rendered from its declared shortcuts
An app SHALL render the hint it shows the reader from the shortcut registry it declares, naming each
key as the registry names it. An app SHALL NOT hold a written copy of its hint beside its bindings.
Where an app shows only some of its shortcuts, which ones it shows SHALL be a property of the
declaration rather than a second list.

#### Scenario: Add a shortcut
- **WHEN** a shortcut is added to an app's declaration
- **THEN** the app's hint SHALL include it with no further edit

#### Scenario: Rebind a shortcut
- **WHEN** a declared binding changes
- **THEN** the hint SHALL name the new key
