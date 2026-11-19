## ADDED Requirements

### Requirement: Startup-sensitive Pi integration uses a narrow certified public surface
The interactive startup graph SHALL consume the smallest documented public Pi surfaces that provide the capabilities required before first input-ready render. It SHALL NOT load Pi command modes, optional workflows, presentation features, or utilities solely because they are re-exported by a broader package entry point.

When the selected Pi package lacks suitable documented narrow entry points, A1 MAY generate an owned startup artifact from documented public exports only. Such an artifact SHALL preserve required module side effects, provider registration, extension contracts, license obligations, public compatibility behavior, and the single shared terminal module identity. Private Pi source or distribution paths SHALL NOT become production imports or build inputs.

#### Scenario: Pi supplies narrow public entry points
- **WHEN** the exact pinned Pi package documents entry points covering A1's startup requirements
- **THEN** the interactive startup graph SHALL consume those entry points instead of a broader public root that evaluates unrelated capabilities

#### Scenario: Pi lacks a required narrow entry point
- **WHEN** a required startup capability is available only through Pi's documented public package root
- **THEN** A1 SHALL either retain that public entry or use a compatibility-certified owned artifact and SHALL NOT deep-import the private implementation

#### Scenario: An owned startup artifact is selected
- **WHEN** A1 generates or bundles a startup artifact from documented Pi exports
- **THEN** exact-package validation SHALL prove equivalent provider registration, extension behavior, licenses, public API behavior, and terminal module identity before the artifact can ship

#### Scenario: Another Pi terminal identity would be introduced
- **WHEN** a narrow entry point or generated artifact would resolve a different terminal module instance from the one exposed to extensions
- **THEN** compatibility validation SHALL reject the candidate before publication
