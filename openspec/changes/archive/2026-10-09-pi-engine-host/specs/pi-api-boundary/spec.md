## ADDED Requirements

### Requirement: Process-wide engine state has one host and sessions come only from its factory
Everything in the Pi engine integration that is process-wide SHALL be owned by one process-level engine host with one lifecycle: the global HTTP dispatcher, the theme singletons, the one-time changelog and package-update announcements, and the startup trace. Engine sessions SHALL be created only through the host's session factory, which SHALL require each session id to be unique among the sessions it has live and SHALL assign a unique id when the caller supplies none. A session SHALL NOT install the dispatcher, apply a theme singleton, announce the changelog, or probe for package updates on its own.

#### Scenario: A second session is created in the same process
- **WHEN** composition creates a second engine session through the host
- **THEN** the dispatcher SHALL stay installed as it was, the theme singletons SHALL be unchanged, no second changelog or package-update announcement SHALL appear, no startup phase SHALL be traced again, and the two sessions SHALL have different ids

#### Scenario: A session writes the HTTP idle timeout
- **WHEN** any session writes the HTTP idle timeout setting
- **THEN** the host SHALL re-install the process dispatcher with that value and SHALL record which session changed it

#### Scenario: A session id is already live
- **WHEN** a caller asks the factory for a session id that names a live session
- **THEN** the factory SHALL reject the request and SHALL create no session

#### Scenario: The host is disposed
- **WHEN** the host is disposed
- **THEN** its signal SHALL abort so host-level probes and timers stop, and every session still live SHALL be disposed
