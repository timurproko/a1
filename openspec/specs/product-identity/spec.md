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
Current release manifests, protocol and evidence schemas, endpoint and pipe names, and diagnostic identifiers SHALL use the `a1` namespace. A1 SHALL reject machine-readable identifiers using the former namespace and SHALL NOT migrate legacy control state. Filenames are governed separately: see the requirement that files are named for what they do.

#### Scenario: Validate current release state
- **WHEN** A1 reads a release manifest, endpoint record, protocol frame, or evidence document created for the current product
- **THEN** the identifier SHALL use its declared `a1` schema or namespace and validation SHALL succeed

#### Scenario: Encounter legacy machine-readable state
- **WHEN** A1 encounters a release manifest, endpoint record, protocol frame, or evidence schema using the former namespace
- **THEN** A1 SHALL reject it as unsupported without rewriting or importing it

#### Scenario: Inspect installed package entries
- **WHEN** the official package is packed or installed
- **THEN** it SHALL contain no artifact named with the former identity

### Requirement: Historical identity references remain factual and isolated
Archived changes, immutable historical evidence, and explicit obsolete-package rejection or deprecation fixtures MAY contain former identity literals such as `@timurproko/addone`. Such references SHALL NOT be imported, rendered, generated, or accepted as current A1 identity.

#### Scenario: Scan current repository surfaces
- **WHEN** repository governance scans production code, scripts, workflows, tests, current documentation, main specs, and non-archived changes
- **THEN** every legacy identity occurrence SHALL either be absent or belong to an explicit rejection/deprecation fixture or approved historical location

#### Scenario: Preserve archived evidence
- **WHEN** a historical record accurately names the product identity used when it was created
- **THEN** the record SHALL remain unchanged and SHALL be excluded from current-identity generation paths

### Requirement: Files and code identifiers are named for what they do, not for the product
Filenames, directory names, native crate and executable names, and source identifiers — functions, constants, types, variables — SHALL be named for their role rather than for the product. The product name SHALL appear where a user or another program addresses A1: the installed command `a1`, the npm package name, environment variables, state directories, protocol and evidence schemas, endpoint names, and user-visible output. It SHALL NOT appear inside the repository's own file, crate, or symbol names, where it says nothing a reader does not already know and makes a rename of the product a rename of the tree.

#### Scenario: Add an entry point or executable
- **WHEN** a package entry, script, native crate, or built executable is added or renamed
- **THEN** its name SHALL describe its role, such as `cli`, `ui`, `guardian`, `supervisor`, `process-guardian`, or `terminal-host`, and SHALL NOT embed the product name

#### Scenario: Name a source identifier
- **WHEN** a function, constant, type, or variable is introduced
- **THEN** its name SHALL describe what it is, and SHALL NOT embed the product name except where it carries an externally addressed value such as an `A1_*` environment variable or a declared schema string

#### Scenario: Address A1 from outside
- **WHEN** a user runs the command, npm resolves the package, the runtime reads its environment or state directories, or a program reads a protocol or evidence schema
- **THEN** the product name SHALL be present, because those names are the product's address rather than its internal structure

#### Scenario: Inspect the repository for product-named files
- **WHEN** repository governance scans file, directory, crate, and executable names
- **THEN** a name embedding the product SHALL fail governance, and the failure SHALL name the file
