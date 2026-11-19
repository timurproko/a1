## ADDED Requirements

### Requirement: The application owner defines its route surface seam
The UI application owner SHALL define the vendor-neutral contract by which a host claims an application route, opens its surface, forwards keyboard and pointer input, receives render requests, and observes close or product-exit requests. A vendor integration MAY adapt that contract to its overlay/runtime API but SHALL NOT redefine the application route lifecycle as a vendor-owned contract.

#### Scenario: Open an app from a vendor-backed shell
- **WHEN** a declared application route is invoked through a vendor-backed shell
- **THEN** the shell SHALL receive a neutral application route surface
- **AND** the application registry and composition SHALL not import a vendor-owned route contract

#### Scenario: Preserve an existing integration import
- **WHEN** an existing consumer imports the route types from the Pi integration public entry during migration
- **THEN** that entry MAY re-export the neutral types without owning a second declaration

### Requirement: The app host applies declared frame caching
The app host SHALL render through the shared frame cache. It SHALL validate and finalize a frame before caching it. An app with a render revision contract SHALL reuse its finalized frame only while every declared revision and its rectangle remain unchanged; an app without that contract SHALL render on every request.

#### Scenario: Render an unchanged cache-aware app
- **WHEN** a cache-aware app renders again at the same size with unchanged revisions
- **THEN** the host SHALL reuse its previously finalized frame

#### Scenario: Render after app state or size changes
- **WHEN** a declared revision or the app rectangle changes
- **THEN** the host SHALL invoke the app renderer and cache the newly finalized frame

#### Scenario: Render an app without revisions
- **WHEN** an app declares no render-cache contract
- **THEN** the host SHALL invoke its renderer on every render request

#### Scenario: App emits a malformed frame
- **WHEN** an app renderer emits an invalid frame on a cache miss
- **THEN** validation SHALL fail and the malformed frame SHALL NOT enter the cache
