## MODIFIED Requirements

### Requirement: A1 settings use current profile scopes only
A1 settings SHALL be scoped to current profile identifiers. Product settings writes SHALL leave Pi's ordinary profile unchanged.

#### Scenario: Product setting is stored
- **WHEN** A1 stores a product setting
- **THEN** the setting SHALL be associated with the A1 profile and SHALL NOT modify `~/.pi/agent`
