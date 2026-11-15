# integration-api Specification

## Purpose
TBD - created by archiving change unify-integration-api-and-colors. Update Purpose after archive.

## Requirements

### Requirement: One bounded versioned public integration boundary
A1 SHALL expose `a1 api <request-json>` with operation selection only in JSON, protocol version 1, bounded correlation IDs and correlated response envelopes. Every call SHALL emit exactly one bounded LF-terminated JSON response and a success/failure exit status. Unsupported versions, operations, settings, scopes, targets and values SHALL return stable structured error codes before mutation. Discovery SHALL NOT start an interactive session, trust prompt, Core probe, endpoint, Pi RPC child or resident process. Local transport and settings paths SHALL remain private.

#### Scenario: Discover without a live session
- **WHEN** a host invokes the capabilities operation
- **THEN** it receives only implemented operations, startup-color and native-identity support without initializing a live session

#### Scenario: Reject malformed requests
- **WHEN** a host supplies an unknown version, operation, scope, setting or invalid value
- **THEN** it receives a structured failure without changing settings or selecting an implicit session

### Requirement: Supported settings share application authority
The API SHALL expose only deliberately supported setting descriptors and read/update operations: profile Default color and exact-session Current color. Descriptors SHALL derive choices, labels, descriptions, section, scope and application metadata from application-owned definitions. Results SHALL distinguish stored and effective values, origin, and applied/stored/deferred disposition. Profile updates SHALL be atomic per-key assignments preserving unrelated concurrent changes and unknown fields; session writes SHALL remain serialized and acknowledged only after application. Engine-backed settings SHALL retain the existing neutral settings port and adapter authority.

#### Scenario: Keep profile and session changes isolated
- **WHEN** a host updates a selected profile's Default color and one exact runtime/session's Current color
- **THEN** the profile value controls future initialization while only that live session changes immediately
- **AND** the UI and API observe the same authoritative values

#### Scenario: Concurrent independent profile changes
- **WHEN** another writer changes unrelated properties while a profile color update is made
- **THEN** the locked per-key update preserves those properties rather than replacing a stale document snapshot

### Requirement: Consumer validates completion identity
Integration clients SHALL use literal argument arrays and validate version, correlation ID, response type, operation and exact target before acknowledging a write. A failed, malformed, mismatched, expired or unavailable response SHALL NOT authorize replay or success. Herdr SHALL package one reusable client through its supported plugin boundary while retaining color policy and membership checks in its color feature. Native identity SHALL be the only supported discovery binding.

#### Scenario: Mismatched acknowledgement
- **WHEN** a reply has the wrong operation, correlation ID, version or target
- **THEN** the client refuses to acknowledge the update and performs no fallback write

#### Scenario: Coordinated breaking rollout
- **WHEN** the consumer encounters an installation or old runtime without the protocol
- **THEN** it skips unavailable control without restarting agents, changing labels, discovering private endpoints or using retired color commands
