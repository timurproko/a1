## ADDED Requirements

### Requirement: Ordinary publication contention preserves ordered successor eligibility

For both ordinary and packaged compatible normal-product launches in a valid supported Core terminal, a legitimate predecessor publication that outlasts a short reservation attempt but later settles normally SHALL NOT permanently disable a still-current successor's identity reporting. The successor SHALL retain its ordered eligibility and attempt bounded promotion and endpoint-ready publication on the normal refresh cadence without a relaunch. Only the latest eligible live successor SHALL promote; delayed older startup or retry work SHALL NOT supersede a later intent, reclaim after successor exit or publish before its own current endpoint binding is ready.

Core read/write settlement and exact public-binding ownership checks SHALL remain serialized across runtimes. A predecessor write already in flight SHALL settle before successor publication. Its acknowledged binding SHALL remain available for safe ownership comparison without rolling back newer ownership. Existing participating runtime versions SHALL NOT gain authority to overwrite a successor through record evolution. Persistent locks, unsettled writes, unsafe coordination and partial or foreign native labels SHALL continue to fail closed; eligibility SHALL NOT authorize lock stealing, coordination reset, guessed ownership or label clearing.

#### Scenario: Successor arrives during a normally settling publication
- **WHEN** a predecessor holds its publication fence longer than the initial reservation attempt and then settles normally while an endpoint-ready successor remains the latest eligible runtime
- **THEN** that successor SHALL be able to publish its complete current session/runtime/timestamp binding on the bounded normal cadence without restarting
- **AND** temporary publication contention SHALL NOT permanently remove its reporting path

#### Scenario: A third runtime supersedes a pending successor
- **WHEN** a later runtime establishes newer ordered intent while an earlier successor still awaits publication authority
- **THEN** the earlier pending successor SHALL lose promotion authority permanently
- **AND** settling the predecessor or stopping the later runtime SHALL NOT let the earlier successor reclaim the terminal

#### Scenario: Old publication finishes after new intent
- **WHEN** a predecessor write is already in flight when a successor establishes intent
- **THEN** successor publication SHALL wait for verified settlement and retain the exact acknowledged predecessor binding needed for ownership comparison
- **AND** predecessor completion SHALL NOT restore an older owner or overwrite a binding already published by a promoted successor

#### Scenario: Pending startup is disposed
- **WHEN** a successor stops before obtaining publication authority
- **THEN** its pending promotion and scheduled integration work SHALL be cancelled
- **AND** it SHALL neither publish later nor clear another runtime's labels

#### Scenario: Coordination cannot prove safe promotion
- **WHEN** an existing or older-format coordination record, retained lock, unsettled child write or public labels cannot establish safe ownership
- **THEN** A1 SHALL leave the uncertain state untouched and keep normal interactive use available
- **AND** no timeout, label age or unavailable old color endpoint SHALL authorize a takeover

### Requirement: Ready compatible bindings support existing membership-driven color consumers

A supported packaged compatible session SHALL expose its ready identity and acknowledged Current-color API through the same producer contract as ordinary normal-product A1. Moving its tab between spaces on the same machine SHALL NOT require a producer restart, focus change or alternative API path. An existing host consumer using current membership, fresh complete native identity, exact session/runtime checks and expiring requests SHALL be able to address that session with the destination's named color after membership and adoption metadata agree. Local and connected Core-only remote contexts SHALL use their respective machine's supported A1 API without a companion installation.

The producer SHALL retain the existing identity, expiry, ambiguity, replacement and post-application acknowledgement protections. Consumer freshness and membership checks SHALL NOT be weakened to admit stale native identity. This contract SHALL NOT claim an atomic transaction between a host membership check and a later color application, or automatic first-frame host coloring for an arbitrary manually invoked wrapper.

#### Scenario: Move an inactive compatible tab on one machine
- **WHEN** a ready compatible session's inactive tab moves from one fixture space to another on the same machine and current membership and adoption labels agree
- **THEN** the existing supported consumer path SHALL be able to apply the destination named color to that session and receive its acknowledged applied color
- **AND** focus, peer sessions, saved Default color and invocation replacement policy SHALL remain unchanged

#### Scenario: Route a connected Core-only machine
- **WHEN** that ready compatible session runs on a connected remote Core-only machine
- **THEN** its native identity and supported color commands SHALL be usable through the existing per-machine routing contract
- **AND** no remote App, customization tree or companion SHALL be required by the producer

#### Scenario: Captured membership is no longer current
- **WHEN** the consumer rechecks an expired, stale, partial, moved-again or membership-unacknowledged captured target before requesting application
- **THEN** that capture SHALL NOT authorize a color write or selection of another session
- **AND** native identity precedence and existing freshness limits SHALL remain unchanged

#### Scenario: Session replacement wins over a pending color request
- **WHEN** a compatible session commits replacement before an old-binding color request is admitted
- **THEN** the request SHALL fail without recoloring the replacement
- **AND** newly advertised identity SHALL follow endpoint readiness for the replacement binding
