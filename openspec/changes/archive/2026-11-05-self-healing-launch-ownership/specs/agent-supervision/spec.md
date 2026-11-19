## MODIFIED Requirements

### Requirement: Stale supervisor ownership is reconciled automatically
A1 SHALL validate ownership using handshake, native process-generation identity, release, endpoint, and boot identity. Numeric PID existence and persisted live-instance lists alone SHALL NOT prove that the recorded supervisor remains alive. Ordinary and retained-release startup SHALL perform bounded automatic reconciliation after forced termination, distinguish a dead or replaced owner from a surviving owner, retry transient identity-probe failures, and converge on one verified supervisor without requiring user PID discovery, control-state deletion, supervisor restart, or machine reboot. Successful recovery SHALL remain silent. A1 MAY apply bounded platform-native cleanup only when exact current ownership and the safety of that cleanup are proven.

#### Scenario: Metadata names a dead process
- **WHEN** endpoint metadata remains after its process exits, including stale nonempty instance lists
- **THEN** A1 SHALL reconcile the stale record and continue the requested launch automatically
- **AND** it SHALL preserve session data and reconcile interrupted instance outcomes without treating persisted rows as proof of liveness

#### Scenario: Operating system reuses the supervisor PID
- **WHEN** native process-generation evidence proves that a recorded supervisor PID now belongs to a later process
- **THEN** A1 SHALL retire only the stale supervisor record and continue startup
- **AND** it SHALL NOT signal the process now using that PID

#### Scenario: Exited Windows process remains queryable
- **WHEN** Windows retains a queryable process object after the recorded supervisor terminates
- **THEN** A1 SHALL use native process-state observation to recognize the exited owner and recover without waiting for every external handle to close

#### Scenario: Identity response is temporarily delayed
- **WHEN** the first control probe fails or times out but the matching supervisor becomes responsive within the bounded recovery budget
- **THEN** A1 SHALL reuse that verified supervisor without printing a blocked-ownership message or starting a duplicate owner

#### Scenario: Concurrent launches recover one stale record
- **WHEN** two launchers encounter the same stale supervisor metadata or one recovery attempt is interrupted
- **THEN** subsequent recovery SHALL converge on one verified endpoint owner within a bounded attempt budget
- **AND** stale cleanup SHALL NOT delete a successor's metadata or socket

#### Scenario: Older metadata lacks native identity
- **WHEN** startup reads a supported legacy supervisor record with only the historical approximate start identity
- **THEN** A1 SHALL retain compatible handshake behavior and reclaim independently proven dead or replaced ownership
- **AND** it SHALL NOT interpret a different identity format, unavailable inspection, or a timestamp approximation as proof that a live process can be terminated

#### Scenario: Ownership safety is uncertain
- **WHEN** bounded recovery cannot establish whether a genuinely live unresponsive process owns a surviving instance
- **THEN** A1 SHALL preserve that process and its evidence rather than blindly terminating it
- **AND** it SHALL report a concise actionable failure tied to the actual recovery problem rather than present internal uncertain-ownership prose as a user repair procedure
