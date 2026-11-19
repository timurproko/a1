# resident-terminal-host Delta

## ADDED Requirements

### Requirement: A holder without a record ends instead of replacing its server
When the server refuses a holder's hello for a definitive reason, it SHALL answer with a `refused` message naming that reason before closing the connection. A holder SHALL treat a refusal for no registry or standby record, a rejected credential, a newer server epoch, or an incarnation, holder identity, child identity, or role mismatch as definitive and SHALL exit, ending its child, without requesting a replacement server. A holder SHALL keep its bounded reconnect only for transient failures, and the interval between replacement requests SHALL grow to at least fifteen seconds. A standby holder SHALL NOT request a replacement server; it SHALL exit when its server disconnects or refuses it.

#### Scenario: Orphaned standby holder meets a new server
- **WHEN** a standby holder outlives the server that prewarmed it and a replacement server refuses its hello for having no record
- **THEN** the holder SHALL exit within its handshake deadline and SHALL spawn no further replacement request

#### Scenario: Registered holder loses its server
- **WHEN** a holder with a registry record cannot connect because no server runs
- **THEN** it SHALL keep requesting a replacement with a growing interval, exactly as before, and SHALL be re-admitted when one starts

### Requirement: Role-spawned children never show a console window on Windows
On Windows, every child process a resident role spawns through the host's fixed command path (replacement-server requests, bounded probes, and maintenance children) SHALL be created without a console window, and detached resident launches SHALL continue to receive no console at all.

#### Scenario: Console-less holder requests a replacement server
- **WHEN** a detached holder spawns a replacement-server request on Windows
- **THEN** no console window SHALL appear for the request process

## MODIFIED Requirements

### Requirement: An idle resident server exits after ten minutes
The resident server SHALL exit after ten minutes with no attached client and no user tab with a live holder. A prewarmed standby tab SHALL NOT keep the server alive; the server SHALL stop it before exiting. The server SHALL record the verified process identity of the standby holder it launched, and whenever it discards the standby or exits it SHALL offer that holder a graceful shutdown and then terminate it by that identity within a bounded deadline, whether or not the holder is connected. The server SHALL remove its endpoint and owner marker only while both still identify it.

#### Scenario: Only a standby tab remains
- **WHEN** every user tab is closed, no client is attached, and ten minutes pass
- **THEN** the server SHALL stop the standby tab, remove its own endpoint and marker, and exit
- **AND** the standby holder process SHALL NOT be running after the server has exited

#### Scenario: Client returns before the deadline
- **WHEN** a client attaches before the ten-minute interval ends
- **THEN** the server SHALL stay running and restart the interval only after it is idle again
