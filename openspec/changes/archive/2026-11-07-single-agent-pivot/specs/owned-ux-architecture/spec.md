## ADDED Requirements

### Requirement: The composition root constructs services and returns the application
The composition root SHALL resolve paths, construct services, construct the backend, construct the presenter, and return the application. It SHALL NOT own timers, heartbeats, state machines, or runtime event handling. Runtime behavior that composition needs SHALL live in a class under an owning module that composition constructs and disposes.

#### Scenario: Session runtime identities must be refreshed
- **WHEN** composition registers session runtime identities
- **THEN** it SHALL construct a registry object that arms its heartbeat with the first claim and releases every claim on dispose
- **AND** the composition root SHALL hold no identity map or refresh timer of its own

## REMOVED Requirements

### Requirement: The composition root constructs and returns
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "The composition root constructs services and returns the application".
