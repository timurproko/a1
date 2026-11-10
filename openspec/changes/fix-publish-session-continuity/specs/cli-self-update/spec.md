## MODIFIED Requirements

### Requirement: Immutable release retention is age-based
Release retention SHALL keep active and selected releases, releases approved within seven days, and every release with a live or unverifiable process-lifetime use claim. Launch selection and claim acquisition SHALL exclude cleanup detachment until ownership is established. The claim SHALL protect release files, required certification evidence, and dependency layers until the process exits. Cleanup SHALL revalidate ownership before destructive boundaries, conservatively retain legacy releases lacking lifetime-claim support, and collect expired unclaimed releases only when safety is established. No supervisor or hot-swapping is required.

#### Scenario: An old release is collected
- **WHEN** an expired claim-capable release is not selected and all its recorded owners are proven absent
- **THEN** its release and unreferenced dependency layers MAY be collected without affecting another executing release

#### Scenario: A recent release is kept
- **WHEN** a release was approved within the last seven days but is no longer active
- **THEN** it SHALL remain on disk

#### Scenario: The record cannot be read
- **WHEN** approval or lifetime ownership cannot be established safely
- **THEN** retention SHALL keep the affected content and continue conservatively

#### Scenario: An old process survives several publications
- **WHEN** a process uses an expired release while newer releases activate
- **THEN** its root and dependency layers SHALL remain available for later lazy imports and helper launches until it exits

#### Scenario: Launch races cleanup
- **WHEN** a launch selects a retained release while cleanup considers it
- **THEN** claim acquisition and collection SHALL be mutually excluded so the launch never enters a detached root

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
