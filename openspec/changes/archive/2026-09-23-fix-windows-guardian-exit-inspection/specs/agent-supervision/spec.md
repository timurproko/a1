## ADDED Requirements

### Requirement: Native process identity inspection reports only active process objects
A1's native process inspector SHALL emit a process identity only when the exact opened operating-system process object is observed active. The identity SHALL include the process ID and stable creation token needed to distinguish PID generations. A terminated-but-queryable process object and a nonexistent PID SHALL produce the established absent/dead outcome without identity output. Permission denial, unsupported access, wait failure, and identity-query failure SHALL remain diagnosable inspection errors and SHALL NOT be converted into proof that a process is either live or dead.

#### Scenario: Inspect an active process repeatedly
- **WHEN** the Windows guardian inspects the same active process more than once
- **THEN** every successful result SHALL report the same PID and creation token
- **AND** each result SHALL be derived from a process object observed active during that inspection

#### Scenario: A terminated process object remains queryable
- **WHEN** a Windows process has terminated but another handle keeps its process object available for creation-time queries
- **THEN** guardian inspection SHALL report the established absent/dead outcome with no identity
- **AND** queryable creation metadata alone SHALL NOT make the process live

#### Scenario: Inspection lacks authority or fails
- **WHEN** A1 cannot acquire the required state-and-identity access or a Windows wait or identity API fails
- **THEN** inspection SHALL fail with a concise diagnosable error
- **AND** reconciliation SHALL preserve ownership uncertainty rather than silently treating the process as active, dead, or safe to terminate

#### Scenario: A PID is reused
- **WHEN** a later process receives the numeric PID of an earlier process
- **THEN** its creation token SHALL differ from the earlier process identity
- **AND** state observation and token retrieval within one inspection SHALL refer to the same opened process object
