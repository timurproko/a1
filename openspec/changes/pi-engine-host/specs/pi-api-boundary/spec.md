## ADDED Requirements

### Requirement: Process-wide engine state has one host
State that the pinned engine integration holds per process, including the global HTTP dispatcher, theme application, release and changelog announcements, package-update probing, and startup trace phases, SHALL be owned by one engine host created by composition. Engine sessions SHALL be created only through the host's session factory, which SHALL require a unique session id. Disposing the host SHALL cancel every host-level probe and timer.

#### Scenario: Two sessions are created in one process
- **WHEN** composition creates two engine sessions through the host
- **THEN** the HTTP dispatcher SHALL be installed once, the changelog SHALL be announced once, and the two sessions SHALL have distinct ids

#### Scenario: A session is created without an id
- **WHEN** a caller requests a session without supplying an id
- **THEN** the factory SHALL assign one that no other live session in the process holds
