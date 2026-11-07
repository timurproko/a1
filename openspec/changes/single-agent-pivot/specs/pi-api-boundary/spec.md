## ADDED Requirements

### Requirement: Product features consume only vendor-neutral A1 contracts
Owned UI, workspace, launch policy, and other product features SHALL consume A1-owned engine, session, presentation, component, and terminal-runtime contracts that do not expose Pi package types or require Pi-specific factories. Selection and construction of the Pi implementation SHALL occur only in a composition boundary outside those features.

#### Scenario: Compose a Pi-backed owned session
- **WHEN** A1 selects Pi as the engine for an owned session
- **THEN** the composition boundary SHALL provide implementations of A1-owned ports to the feature without requiring the feature to import or construct a Pi adapter

#### Scenario: Switch the Pi-backed session
- **WHEN** the owned UI resumes, forks, or switches the Pi-backed session it presents
- **THEN** session state, routing, persistence, and presentation SHALL remain expressed only through A1 contracts and durable session identities

#### Scenario: Architecture dependency is violated
- **WHEN** production feature or workspace code imports a Pi package, concrete Pi adapter, Pi-specific component factory, or Pi-named runtime contract
- **THEN** the deterministic architecture gate SHALL fail with the offending path

## REMOVED Requirements

### Requirement: Product features depend only on vendor-neutral A1 contracts
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Product features consume only vendor-neutral A1 contracts".
