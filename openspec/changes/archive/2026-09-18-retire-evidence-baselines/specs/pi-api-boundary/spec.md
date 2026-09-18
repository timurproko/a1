## MODIFIED Requirements

### Requirement: Production Pi integration uses documented public APIs only
Production integration SHALL use documented package-root exports and public entry points. It SHALL NOT deep-import Pi source or distribution modules, inspect dependency package files, derive runtime behavior from dependency directory layout, patch installed code, mutate prototypes, inspect private state, or authorize behavior from distribution hashes. The production boundary check SHALL report every finding in the current tree; it SHALL NOT subtract findings against a recorded snapshot of an earlier commit. A transitional exemption, if one is ever needed, SHALL be an explicit reviewed allowlist entry carrying its reason.

#### Scenario: Load an upstream theme, asset, documentation item, or changelog presentation
- **WHEN** the owned product needs content not exposed through a documented Pi API
- **THEN** A1 SHALL use an attributed A1-owned resource or omit the optional presentation rather than read a guessed path under the installed Pi package

#### Scenario: A public API is insufficient
- **WHEN** required engine behavior is not available from documented package exports
- **THEN** the compatibility gate SHALL report the unsupported capability and implementation SHALL stop until A1 owns an alternative or Pi exposes a public API

#### Scenario: Non-production provenance tooling inspects upstream source
- **WHEN** source synchronization or license evidence requires upstream paths or source maps
- **THEN** that inspection SHALL remain isolated from shipped production modules and SHALL NOT become a runtime requirement

#### Scenario: A boundary finding appears in production source
- **WHEN** a production module reads the Pi package directory, traverses `node_modules` toward a Pi package, constructs a private package path, reflects a concrete Pi constructor, or resolves the ambient `pi` executable
- **THEN** the architecture gate SHALL fail with the path, line, and finding category
- **AND** no committed snapshot SHALL suppress it
