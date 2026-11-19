## ADDED Requirements

### Requirement: Delivery recovery follows operation quiescence
Exceptional delivery recovery SHALL coordinate cancellation with actual admitted-operation settlement, fence stale generations, and resubscribe once it is safe even when settlement occurs after the initial recovery check. Applied mutations SHALL NOT be reported cancelled solely because their presentation failed. An unsafe non-quiescent session SHALL retain an explicit safe stop path, never automatically replay work. Recovery diagnostics SHALL use bounded allowlisted classifications and counters without conversation text, arguments, credentials, or raw exception messages.

#### Scenario: Delayed operation settles
- **WHEN** overload cancellation completes before a still-admitted operation finishes cleanup
- **THEN** recovery SHALL re-evaluate after settlement and reopen admission only when all old work is quiescent
- **AND** a newer generation or disposal SHALL prevent stale recovery from reopening the session

#### Scenario: Applied model selection survives presentation recovery
- **WHEN** model selection has applied before a delivery incident
- **THEN** its operation outcome SHALL preserve that application without retrying the mutation or pretending it never occurred

#### Scenario: Diagnose an incident privately
- **WHEN** a delivery incident is recorded or propagated to fatal handling
- **THEN** its allowlisted reason and bounded counters SHALL distinguish saturation from listener failure without recording private payloads

### Requirement: Authoritative history size is not pending event backlog
The owned UI SHALL deliver authoritative session views whose accumulated transcript exceeds the ordinary pending-event payload allowance without entering overload solely because of that history size. Delivery SHALL share authoritative immutable state rather than copy history per announcement, and SHALL bound event count and state retained solely for pending delivery, including distinct obsolete snapshots and image assets. Snapshot delivery SHALL preserve emitted revisions, semantic source ordering, generation isolation, and balanced asset lifetime. This SHALL NOT disable genuine protected-work saturation recovery, silently truncate history, broadly coalesce side-effect-bearing views, or substitute newer state across a semantic barrier.

#### Scenario: Large authoritative view starts a session
- **WHEN** the engine binds a valid session whose projected transcript exceeds 8 MiB and pending work is otherwise within its allowance
- **THEN** the startup view and explicit flush SHALL complete without overload cancellation or fatal exit
- **AND** the UI SHALL retain the complete authoritative transcript

#### Scenario: Update notice refreshes a large view
- **WHEN** an installed-update announcement emits a view for a large active session without genuine delivery backlog
- **THEN** the notice SHALL arrive without aborting agent work, replacing the session, or stopping input
- **AND** later commands SHALL remain deliverable

#### Scenario: Switch model in a large idle session
- **WHEN** the owned model-selection workflow applies an available model in a large idle session
- **THEN** the resulting authoritative view SHALL be delivered without overload or cancellation solely because of historical transcript size
- **AND** the model SHALL be applied once and the workflow SHALL report successful completion truthfully

#### Scenario: Switch model while a large session has admitted work
- **WHEN** an allowed model-selection operation updates a large session with an admitted prompt still running
- **THEN** the resulting view refresh SHALL NOT cancel that prompt, fail the session, or disable submission solely because of historical transcript size
- **AND** subsequent input SHALL remain usable without restarting the process

#### Scenario: Several large snapshots span semantic barriers
- **WHEN** ordered distinct authoritative snapshots and command or lifecycle boundaries are pending
- **THEN** delivery SHALL preserve the required snapshot revisions and boundary ordering within explicit finite retention bounds
- **AND** generation invalidation and consumption SHALL release no-longer-needed snapshots and image assets

#### Scenario: Genuine protected backlog still saturates
- **WHEN** independent nonreplaceable pending work exhausts its actual bounded allowance
- **THEN** the existing explicit overload and command-settlement behavior SHALL remain enforced
