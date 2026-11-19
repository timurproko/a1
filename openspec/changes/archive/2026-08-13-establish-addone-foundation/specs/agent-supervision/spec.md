## Purpose

Defines immutable release cohorts, negotiated control contracts, durable process generations, and exclusive foreground-terminal lease supervision.

## ADDED Requirements

### Requirement: Live AddOne processes use one immutable release cohort
Every live AddOne bootstrap, supervisor, and AddOne-owned runtime process SHALL execute from retained immutable release content with package-derived identity. Installing a candidate SHALL NOT overwrite files used by a live cohort or connect incompatible releases.

#### Scenario: Launch encounters an older live supervisor
- **WHEN** the mutable command entry encounters a verified older live AddOne cohort
- **THEN** AddOne SHALL use that cohort's retained release or complete a verified replacement before connecting

#### Scenario: Safe cohort activation
- **WHEN** active foreground ownership is released
- **THEN** AddOne SHALL verify release identity, atomically activate the candidate, and avoid duplicate supervisor ownership

### Requirement: Control compatibility is negotiated by required features
Control peers SHALL negotiate stable envelope identity and required features before accepting commands. Release and contract identities SHALL derive from installed metadata and generated protocol artifacts rather than a manually maintained global protocol number.

#### Scenario: Additive peer differences
- **WHEN** peers differ only by unknown optional fields, events, or features
- **THEN** they SHALL negotiate shared required features and safely ignore unsupported additive information

#### Scenario: Required feature is unavailable
- **WHEN** either peer requires a feature the other does not advertise
- **THEN** no application command SHALL be accepted and release coordination SHALL select a matching cohort or fail safely

### Requirement: Immediate package replacement is ownership-safe and atomic
Stable and preview updates SHALL coordinate verified owned-process shutdown, npm installation, immutable materialization, certification, stale-generation reconciliation, active-reference commit, and rollback through one durable transaction. The npm tag SHALL select only the exact target and SHALL NOT weaken ownership or rollback semantics.

#### Scenario: Verified foreground generations exist
- **WHEN** update starts while a verified cohort owns foreground generations
- **THEN** AddOne SHALL request bounded shutdown, verify ownership release, and only then replace the mutable package

#### Scenario: Installation or activation fails
- **WHEN** installation, materialization, certification, or activation fails
- **THEN** AddOne SHALL retain diagnostics, avoid mixed ownership, and retain or restore one verified runnable cohort when possible

### Requirement: Generation liveness is boot-scoped and observed
A process generation SHALL be live only when owned by a currently verified supervisor boot and backed by authenticated runtime ownership. Persisted state alone SHALL NOT prove liveness. Startup SHALL reconcile nonterminal generations from prior boots before publishing ownership.

#### Scenario: Supervisor was terminated
- **WHEN** a dead supervisor left generations marked active
- **THEN** the next coordinator or boot SHALL mark them non-live and SHALL NOT restart an old release merely because persisted rows exist

#### Scenario: Supervisor starts from existing control data
- **WHEN** a supervisor boots after an unclean exit
- **THEN** published ownership SHALL include only generations established or authenticated by that boot

### Requirement: Stale supervisor ownership is reconciled automatically
AddOne SHALL validate ownership using handshake, process, release, endpoint, and boot identity. It MAY apply bounded platform-native cleanup only when stale ownership is proven safe to remove.

#### Scenario: Metadata names a dead process
- **WHEN** endpoint metadata remains after its process exits
- **THEN** AddOne SHALL replace the stale record without asking the user to discover a PID

#### Scenario: Ownership safety is uncertain
- **WHEN** AddOne cannot prove whether an unresponsive process owns a live generation
- **THEN** AddOne SHALL preserve it and report a diagnosable blocked state rather than blindly terminating it

### Requirement: Transparent generations use one exclusive foreground lease
The supervisor SHALL record logical identity, process generation, native process identity, lifecycle outcome, and one exclusive transparent foreground-terminal lease. It SHALL NOT claim a resident framebuffer, terminal byte stream, or visual reconnection.

#### Scenario: Start a transparent generation
- **WHEN** the supervisor authorizes transparent launch
- **THEN** it SHALL grant one foreground broker an exclusive lease and record that no AddOne-authoritative terminal surface exists

#### Scenario: Lease owner disappears
- **WHEN** the foreground broker disappears while a child may remain active
- **THEN** the supervisor SHALL apply the declared bounded stop policy and report the outcome without reconstructing terminal continuity

#### Scenario: Stale lease is reconciled
- **WHEN** lease identity is stale and exact owner death is proven
- **THEN** the supervisor SHALL release stale ownership without affecting unrelated processes
