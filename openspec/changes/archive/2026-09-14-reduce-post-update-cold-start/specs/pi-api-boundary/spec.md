## ADDED Requirements

### Requirement: Startup optimization preserves the public Pi boundary
Reducing A1's startup module graph SHALL continue to consume only documented public Pi exports and SHALL preserve all required compatibility checks. A1 SHALL NOT gain startup speed by deep-importing private Pi distribution paths, patching installed Pi files, deriving behavior from source maps, or creating a second terminal package identity.

#### Scenario: Pi exposes narrower public entry points
- **WHEN** the exact pinned Pi dependency documents public runtime or component entry points that cover A1's required capabilities
- **THEN** A1 MAY consume those entry points after the complete compatibility gates pass

#### Scenario: Narrow public entry points are unavailable
- **WHEN** the pinned dependency exposes a required capability only through its documented package-root API
- **THEN** A1 SHALL retain that public API or use an A1-owned alternative rather than import a private subpath

#### Scenario: Build-time startup facade is produced
- **WHEN** A1 generates or bundles an owned startup facade from documented public Pi exports
- **THEN** provenance, licenses, compatibility behavior, extension contracts, and the single terminal module identity SHALL remain validated against the exact pinned dependency

#### Scenario: Optimization introduces another terminal module copy
- **WHEN** an optimized artifact would cause A1 and extensions to resolve different Pi terminal classes
- **THEN** package and launch compatibility validation SHALL reject that artifact before release
