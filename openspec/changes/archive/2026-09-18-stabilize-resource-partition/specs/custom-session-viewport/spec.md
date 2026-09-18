## ADDED Requirements

### Requirement: A copy helper's late exit does not alter its delivered text
Once an isolated copy helper has reported a complete prepared result, A1 SHALL deliver
exactly that prepared text to the clipboard writer or fail explicitly. Terminating the
helper because it lingers past the cleanup grace after its result SHALL NOT replace the
delivered text with an empty payload or otherwise write content the user did not select.
An explicit cancellation, a protocol violation, or an incomplete byte count SHALL still
discard the prepared text and SHALL NOT be reported as delivered.

#### Scenario: Helper lingers after a complete result
- **WHEN** a copy helper reports a complete prepared result and has not exited when the cleanup grace elapses
- **THEN** A1 SHALL terminate the helper
- **AND** the clipboard writer SHALL receive exactly the prepared text once

#### Scenario: Helper is canceled after a complete result
- **WHEN** the owner cancels a copy request after its helper reported a result but before delivery
- **THEN** the request SHALL settle as canceled and the clipboard writer SHALL NOT be called
