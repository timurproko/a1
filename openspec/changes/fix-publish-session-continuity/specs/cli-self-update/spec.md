## ADDED Requirements

### Requirement: Restart-ready announcements preserve large-session execution
Activation of an approved successor and its restart-ready announcement SHALL leave an existing large-session process on its executing immutable release, without aborting its agent work, replacing its session, disposing its UI, or requiring restart because its authoritative transcript exceeds the pending delivery allowance. The notice SHALL remain informational; ordinary subsequent input SHALL continue in the existing process, and only a later launch SHALL select the approved successor. Existing retention and certification guarantees remain unchanged.

#### Scenario: Another process activates a successor during long-session work
- **WHEN** a retained published process has more than 8 MiB of authoritative transcript and observes a newer approved same-channel active release
- **THEN** it SHALL announce restart readiness without cancelling active work or changing executing-release or session identity
- **AND** subsequent commands SHALL remain usable on the original release

#### Scenario: Resume after an informational update notice
- **WHEN** the user later exits that large session and executes its normal resume command through a fixed installed entry
- **THEN** the new process SHALL select the approved release and restore the persisted conversation under the same-pin restoration contract
- **AND** the preceding announcement SHALL require no session-file repair, truncation, or migration
