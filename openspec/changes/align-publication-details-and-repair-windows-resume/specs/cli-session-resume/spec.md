## ADDED Requirements

### Requirement: Concurrent independent resumes share startup resources safely

Independent packaged launches selecting different supported same-pin sessions in the same profile SHALL reach input readiness concurrently on supported platforms, including Windows, without treating transient shared startup-resource contention as an unexpected fatal exit. Each launch SHALL restore only its selected session, and closing one SHALL NOT terminate or release the other's session. This behavior SHALL preserve single-writer fencing for attempts to open the same session and SHALL NOT suppress genuine startup failures.

#### Scenario: Two different sessions resume together on Windows
- **WHEN** two packaged public-entry launches concurrently select different persisted sessions under one profile
- **THEN** both SHALL reach input readiness with their respective transcript markers and without the other session's marker
- **AND** closing the first SHALL leave the second running until independently closed

#### Scenario: Shared startup contention does not weaken ownership
- **WHEN** shared startup resources are accessed concurrently while session ownership is acquired
- **THEN** independent sessions SHALL remain independently usable
- **AND** a second writer for an already occupied session SHALL remain blocked by the existing ownership contract
