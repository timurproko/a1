## ADDED Requirements

### Requirement: Prompt history settings declare persistence and retention boundaries
A1 SHALL declare `promptHistoryEnabled` as a boolean defaulting to true and `promptHistoryMaxItems` as an integer allowing 10 through 100 in steps of 10, defaulting to 100. They SHALL appear in bare A1's History settings section as `Persistent history` and `History limit`, using existing shared settings controls, profile-local A1 settings persistence, validation, and stored/effective-state presentation. Both SHALL declare a `next-start` application boundary. No Pi settings document or separate history settings file SHALL be used, and `a1 pi` SHALL neither expose nor apply these A1 settings.

#### Scenario: Start without stored history settings
- **WHEN** a bare-A1 profile has no stored history settings
- **THEN** its next-start effective values SHALL enable persistence with a 100-entry count limit
- **AND** byte retention limits SHALL still apply independently

#### Scenario: Change retention
- **WHEN** the user saves a valid history limit
- **THEN** the settings surface SHALL show that it applies on the next start rather than claiming a live effect
- **AND** the next enabled launch SHALL apply that count to the shared profile store, pruning oldest entries if necessary
- **AND** existing writers SHALL follow the store's newly applied limit without restoring their older startup limit

#### Scenario: Reject an invalid limit
- **WHEN** a stored history limit is not one of 10, 20, 30, 40, 50, 60, 70, 80, 90, or 100
- **THEN** existing settings validation SHALL reject that value and resolve the declared default without blocking startup

#### Scenario: Disable history for subsequent launches
- **WHEN** the user disables persistent history and restarts A1
- **THEN** that process SHALL not create, read, write, or poll the durable history store
- **AND** it SHALL keep existing current-session history behavior
- **AND** disabling SHALL leave retained records intact rather than claiming to erase them

#### Scenario: Another enabled process is already running
- **WHEN** one instance saves disabled persistence while another enabled instance remains running
- **THEN** the setting SHALL remain next-start and SHALL NOT claim to stop persistence in existing instances
- **AND** the setting metadata and maintained documentation SHALL explain this boundary

#### Scenario: Re-enable persistence
- **WHEN** the user re-enables history and starts a new enabled process
- **THEN** compatible previously retained records SHALL become available again under the configured count and byte limits

#### Scenario: Keep history settings profile-local
- **WHEN** different A1 profiles store different history settings or the Pi comparison starts
- **THEN** each bare-A1 launch SHALL apply only its own profile's values
- **AND** the Pi comparison and `~/.pi/agent` SHALL remain untouched
