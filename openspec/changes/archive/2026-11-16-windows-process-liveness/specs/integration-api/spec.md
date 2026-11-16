## ADDED Requirements

### Requirement: Windows liveness probes do not mistake thread ids for live sessions

On Windows, A1 SHALL NOT treat a permission-refused signal probe as proof that a session-control record's owner process exists. It SHALL confirm such a pid against the live process table and SHALL report the record's owner dead when the pid is absent, so stale-record pruning and lookup bounds see only real processes. When the process table cannot be read, A1 SHALL keep the conservative answer and SHALL NOT invent a dead process. Unix semantics SHALL remain unchanged.

#### Scenario: A dead session's pid is reused by a thread
- **WHEN** a record's owner pid answers access denied but no process with that id is listed
- **THEN** the record SHALL be judged dead and become eligible for pruning

#### Scenario: A live process the caller cannot open
- **WHEN** a record's owner pid answers access denied and a process with that id is listed
- **THEN** the record SHALL remain a live candidate

#### Scenario: Process table unavailable
- **WHEN** the process table cannot be read
- **THEN** a permission-refused pid SHALL remain alive as before
