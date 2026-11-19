## MODIFIED Requirements

### Requirement: Current environment and state names use the A1 namespace
User-facing product configuration SHALL retain `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, and any other explicitly classified supported external setting. Private process coordination, tests, and automation SHALL use separately classified, descriptive environment keys whose canonical spellings do not contain `a1`, case-insensitively. Confirmed private keys SHALL have one supported neutral spelling. Implementations SHALL NOT provide legacy private aliases, dual reads/writes, compatibility adapters, or migration helpers. Obsolete private spellings SHALL NOT supply missing current-contract values or influence runtime selection. Public and private key definitions SHALL be validated according to their respective contracts rather than requiring every environment key to use the product prefix. Default Windows and Unix control-state directory resolution SHALL remain unchanged and retain the product namespace. A1 SHALL NOT read variables or control-state directories using the former product identity. A1 SHALL retain `~/.a1/agent` for its profile and preserve the comparison launch's ordinary `~/.pi/agent` resolution. This internal naming change SHALL NOT relocate existing user data or alter independently specified history-storage behavior.

#### Scenario: Override A1 state roots
- **WHEN** the user supplies valid `A1_CONFIG_DIR`, `A1_DATA_DIR`, and `A1_RUNTIME_DIR` values
- **THEN** A1 SHALL use those values for its control state and SHALL leave profile-root selection unchanged

#### Scenario: Supply only a legacy environment variable
- **WHEN** the environment supplies only a variable using the former product prefix without the corresponding supported current setting
- **THEN** A1 SHALL ignore the former-product variable and resolve the normal A1 default; the private-contract cutover SHALL NOT reintroduce support for the former product identity

#### Scenario: Resolve default state paths
- **WHEN** no A1 state override is supplied
- **THEN** A1 SHALL resolve the same platform-appropriate defaults as before the internal naming change, containing the `A1` or `a1` product namespace

### Requirement: Current machine-readable identifiers use the A1 namespace
Current release manifests, protocol and evidence schemas, and diagnostic identifiers SHALL use the `a1` namespace. A1 SHALL reject machine-readable identifiers using the former namespace and SHALL NOT migrate legacy control state. Filenames are governed separately: see the requirement that files are named for what they do.

#### Scenario: Validate current release state
- **WHEN** A1 reads a release manifest, release-state or update-journal record, or evidence document created for the current product
- **THEN** the identifier SHALL use its declared `a1` schema or namespace and validation SHALL succeed

#### Scenario: Encounter legacy machine-readable state
- **WHEN** A1 encounters a release manifest, release-state or update-journal record, or evidence schema using the former namespace
- **THEN** A1 SHALL reject it as unsupported without rewriting or importing it

#### Scenario: Inspect installed package entries
- **WHEN** the official package is packed or installed
- **THEN** it SHALL contain no artifact named with the former identity

### Requirement: Files and code identifiers are named for what they do, not for the product
Filenames, directory names, executable names, and source identifiers SHALL be named for their role rather than for the product. Internal constants, variables, parameters, functions, methods, classes, interfaces, types, enums, and members SHALL NOT contain the substring `a1`, matched case-insensitively, including in private names, aliases, destructuring bindings, and quoted or statically known computed member names. Existing file, directory, crate, and executable naming governance SHALL remain in effect.

The product name SHALL remain where users or independently versioned consumers address A1: the installed command `a1`, npm package identity, supported public environment settings, user-state paths, declared protocol and evidence schemas, and user-visible output. Supported external spellings SHALL be represented as classified boundary data rather than branded internal declarations. Confirmed private spellings SHALL NOT receive an external-boundary exemption merely to retain old behavior. An `A1_*` property spelling alone SHALL NOT establish an external contract or grant an exemption. External member names required by a declared serialization or third-party interface SHALL be confined to that interface boundary and SHALL NOT justify similarly named internal state.

#### Scenario: Add an entry point or executable
- **WHEN** a package entry, script, or built executable is added or renamed
- **THEN** its name SHALL describe its role, such as `cli`, `ui`, `activate`, `warmup`, or `release-cleanup`, and SHALL NOT embed the product name

#### Scenario: Name a source identifier
- **WHEN** an internal declaration or member is introduced or changed
- **THEN** its name SHALL describe its role without a case-insensitive `a1` substring
- **AND** storing an external branded value SHALL NOT permit a branded internal name

#### Scenario: Address A1 from outside
- **WHEN** a user runs the command, npm resolves the package, the runtime reads supported public environment settings or state directories, or a program reads a declared protocol or evidence schema
- **THEN** the existing product spelling SHALL remain because it is an external address rather than internal structure

#### Scenario: Inspect the repository for product-named files
- **WHEN** repository governance scans file, directory, crate, and executable names
- **THEN** a name embedding the product SHALL fail governance, and the failure SHALL name the file

#### Scenario: Hide branding in a different identifier form
- **WHEN** a changed source file contains an internal lowercase embedded name, private member, quoted method, or branded local alias
- **THEN** naming governance SHALL reject it regardless of casing or declaration syntax

#### Scenario: Use an arbitrary uppercase property
- **WHEN** an internal object or type declares an `A1_*` property without an approved external contract
- **THEN** naming governance SHALL reject it rather than automatically treating it as an environment setting

#### Scenario: Retain an existing serialized key
- **WHEN** a supported persisted or externally consumed record requires a branded field spelling
- **THEN** the declared boundary SHALL retain the serialized spelling and use neutral internal representations where it is translated
- **AND** the naming refactor SHALL NOT silently change stored schemas or invalidate existing records
