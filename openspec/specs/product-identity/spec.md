# Product Identity Specification

## Purpose

Defines one coherent A1 identity across user-visible output, package metadata, environment configuration, storage, protocols, artifacts, and current repository surfaces.

## Requirements

### Requirement: A1 has one authoritative product identity
The product SHALL identify itself with display name `A1`, command `a1`, npm package `@timurproko/a1`, filesystem slug `a1`, and machine-readable namespace `a1`. Runtime behavior, scripts, workflows, and generated evidence SHALL derive identity-bearing values from one authoritative product identity rather than independently embedding equivalent literals.

#### Scenario: Render a product diagnostic
- **WHEN** A1 reports startup, version, update, lifecycle, or failure information
- **THEN** the diagnostic SHALL use display name `A1` and SHALL NOT display the former brand as the current product name

#### Scenario: Change an identity value in a controlled test
- **WHEN** a test substitutes an alternate product identity at the authority boundary
- **THEN** all identity-derived diagnostics and generated names under test SHALL use the substituted value without editing feature modules

### Requirement: Current environment and state names use the A1 namespace
A1 SHALL recognize only `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, `A1_DATABASE_PATH`, `A1_ENDPOINT`, and other explicitly declared `A1_*` runtime variables. Default Windows control-state directories SHALL use `A1`; default Unix control-state directories SHALL use `a1`. A1 SHALL NOT read variables or control-state directories using the former identity. A1 SHALL use `~/.a1/agent` for its Pi profile and preserve Pi's ordinary `~/.pi/agent` resolution for the comparison launch.

#### Scenario: Override A1 state roots
- **WHEN** the user supplies valid `A1_CONFIG_DIR`, `A1_DATA_DIR`, and `A1_RUNTIME_DIR` values
- **THEN** A1 SHALL use those values for its control state and SHALL leave Pi profile-root selection unchanged

#### Scenario: Supply only a legacy environment variable
- **WHEN** the environment supplies only a variable using the former prefix without the corresponding `A1_*` variable
- **THEN** A1 SHALL ignore the legacy variable and resolve the normal A1 default

#### Scenario: Resolve default state paths
- **WHEN** no A1 state override is supplied
- **THEN** A1 SHALL resolve platform-appropriate defaults containing only the `A1` or `a1` product namespace

### Requirement: Current machine-readable identifiers use the A1 namespace
Current release manifests, protocol and evidence schemas, endpoint and pipe names, executable artifacts, internal package entry filenames, native crate names, temporary paths, and diagnostic filenames SHALL use the `a1` namespace. A1 SHALL reject machine-readable identifiers using the former namespace and SHALL NOT migrate legacy control state.

#### Scenario: Validate current release state
- **WHEN** A1 reads a release manifest, endpoint record, protocol frame, or evidence document created for the current product
- **THEN** the identifier SHALL use its declared `a1` schema or namespace and validation SHALL succeed

#### Scenario: Encounter legacy machine-readable state
- **WHEN** A1 encounters a release manifest, endpoint record, protocol frame, or evidence schema using the former namespace
- **THEN** A1 SHALL reject it as unsupported without rewriting or importing it

#### Scenario: Inspect installed package entries
- **WHEN** the official package is packed or installed
- **THEN** public and internal executable entry filenames included by A1 SHALL use `a1` and SHALL contain no artifact named with the former identity

### Requirement: Historical identity references remain factual and isolated
Archived changes, immutable historical evidence, and explicit obsolete-package rejection or deprecation fixtures MAY contain former identity literals such as `@timurproko/addone`. Such references SHALL NOT be imported, rendered, generated, or accepted as current A1 identity.

#### Scenario: Scan current repository surfaces
- **WHEN** repository governance scans production code, scripts, workflows, tests, current documentation, main specs, and non-archived changes
- **THEN** every legacy identity occurrence SHALL either be absent or belong to an explicit rejection/deprecation fixture or approved historical location

#### Scenario: Preserve archived evidence
- **WHEN** a historical record accurately names the product identity used when it was created
- **THEN** the record SHALL remain unchanged and SHALL be excluded from current-identity generation paths
