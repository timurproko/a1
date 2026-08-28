## MODIFIED Requirements

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

## ADDED Requirements

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
