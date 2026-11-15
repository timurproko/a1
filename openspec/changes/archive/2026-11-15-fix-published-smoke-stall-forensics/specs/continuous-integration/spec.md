## ADDED Requirements

### Requirement: Published installer smoke process history

While a published-installer smoke command with a long budget runs, the harness SHALL periodically sample the fixture-owned process inventory using the same ownership selection as settlement, without stopping any process and without altering the identities settlement later verifies. Failure evidence SHALL record each sampled process's first and last sighting, parent, start identity, and sanitized arguments, along with the number of samples and any sampling errors.

#### Scenario: A detached updater descendant disappears before the deadline

- **WHEN** a fixture-owned process seen during sampling is absent from later samples
- **THEN** failure evidence SHALL show its last sighting earlier than the command's end so disappearance order is visible

#### Scenario: Sampling fails

- **WHEN** a process inventory sample cannot be read
- **THEN** the harness SHALL record the sampling error and continue the command and later settlement unchanged

### Requirement: Published installer smoke Windows system records

When a published-installer smoke stage fails on Windows, the harness SHALL record bounded sanitized Windows event records created since the fixture began from the Windows Defender operational log, application crash and error-reporting providers, and service failure or shutdown events, together with the antimalware real-time and behavior-monitoring status. On other platforms this record SHALL be empty. Reading system records SHALL be bounded in time, SHALL NOT change antimalware configuration, and SHALL NOT replace the primary failure when it fails.

#### Scenario: Antimalware remediates a fixture process

- **WHEN** a Windows Defender detection or action event is logged during the smoke
- **THEN** the failure evidence SHALL include that event's identifier, time, provider, and sanitized message

#### Scenario: System records are unavailable

- **WHEN** the event query fails or times out
- **THEN** the evidence SHALL record that error and the primary stage failure SHALL remain authoritative

### Requirement: Published installer smoke replacement state

When a published-installer smoke stage fails, the harness SHALL record for each installation prefix the retired package directories present, the installed application manifest version if readable, and the sanitized content of the public launchers, so evidence shows how far package replacement progressed.

#### Scenario: npm replaced the package before its tree vanished

- **WHEN** the installed manifest names the target version while the retired predecessor directory still exists
- **THEN** the evidence SHALL show both so the failure is attributed to settlement after replacement rather than to installation
