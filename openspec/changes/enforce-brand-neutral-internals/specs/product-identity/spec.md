## MODIFIED Requirements

### Requirement: Current environment and state names use the A1 namespace
User-facing product configuration SHALL retain `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, `A1_DATABASE_PATH`, `A1_ENDPOINT`, and any other explicitly classified supported external setting. Private process coordination, tests, and automation SHALL use separately classified, descriptive environment keys whose canonical spellings do not contain `a1`, case-insensitively. A private key's former `A1_*` spelling SHALL be recognized only by an explicitly classified compatibility boundary when a supported older producer or consumer requires it. Public and private key definitions SHALL be validated according to their respective contracts rather than requiring every environment key to use the product prefix.

Default Windows and Unix control-state directory resolution SHALL remain unchanged and retain the product namespace. A1 SHALL NOT read variables or control-state directories using the former product identity. A1 SHALL retain `~/.a1/agent` for its profile and preserve the comparison launch's ordinary `~/.pi/agent` resolution. This internal naming change SHALL NOT relocate existing user data or alter independently specified history-storage behavior.

#### Scenario: Override A1 state roots
- **WHEN** the user supplies valid `A1_CONFIG_DIR`, `A1_DATA_DIR`, and `A1_RUNTIME_DIR` values
- **THEN** A1 SHALL use those values for its control state and SHALL leave profile-root selection unchanged

#### Scenario: Supply only a legacy environment variable
- **WHEN** the environment supplies only a variable using the former product prefix without the corresponding supported current setting
- **THEN** A1 SHALL ignore the former-product variable and resolve the normal A1 default
- **AND** private-key compatibility SHALL NOT reintroduce support for the former product identity

#### Scenario: Resolve default state paths
- **WHEN** no A1 state override is supplied
- **THEN** A1 SHALL resolve the same platform-appropriate defaults as before the internal naming change, containing the `A1` or `a1` product namespace

#### Scenario: Read a public setting through neutral code
- **WHEN** implementation code reads a supported public environment setting
- **THEN** its internal bindings and helpers SHALL have brand-neutral names while the externally supplied key retains its existing spelling

#### Scenario: Validate a private environment contract
- **WHEN** a confirmed private environment key has a brand-neutral canonical spelling
- **THEN** configuration validation SHALL accept it without requiring an `A1_` prefix
- **AND** public-setting spelling, uniqueness, and value-validation requirements SHALL remain enforced

### Requirement: Files and code identifiers are named for what they do, not for the product
Filenames, directory names, native crate and executable names, and source identifiers SHALL be named for their role rather than for the product. Internal constants, variables, parameters, functions, methods, classes, interfaces, types, enums, and members SHALL NOT contain the substring `a1`, matched case-insensitively, including in private names, aliases, destructuring bindings, and quoted or statically known computed member names. Existing file, directory, crate, and executable naming governance SHALL remain in effect.

The product name SHALL remain where users or independently versioned consumers address A1: the installed command `a1`, npm package identity, supported public environment settings, user-state paths, declared protocol and evidence schemas, and user-visible output. Those external spellings and necessary legacy private spellings SHALL be represented as classified boundary data rather than branded internal declarations. An `A1_*` property spelling alone SHALL NOT establish an external contract or grant an exemption. External member names required by a declared serialization or third-party interface SHALL be confined to that interface boundary and SHALL NOT justify similarly named internal state.

#### Scenario: Add an entry point or executable
- **WHEN** a package entry, script, native crate, or built executable is added or renamed
- **THEN** its name SHALL describe its role, such as `cli`, `ui`, `guardian`, `supervisor`, `process-guardian`, or `terminal-host`, and SHALL NOT embed the product name

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

## ADDED Requirements

### Requirement: Environment exposure and compatibility exceptions are explicit and auditable
Every owned environment-key definition and branded environment-key use SHALL have an auditable classification as public configuration, external integration, private runtime coordination, private test or automation, compatibility alias, or an identified existing key pending exposure review. Classification SHALL record the logical role, exact spelling, owning boundary, producers and consumers, exposure evidence, and applicable compatibility obligations. Non-environment tokens found in an environment registry SHALL be classified according to their actual protocol role. Definitions with no active consumer SHALL require explicit removal or a justified retained contract rather than automatic renaming.

Existing keys pending exposure review SHALL preserve their spelling under exact, bounded inventory entries; they SHALL NOT create a wildcard exemption or authorize new unclassified keys. Compatibility aliases SHALL name their canonical private key and the supported cross-version condition requiring retention. Exceptions SHALL be limited to actual boundary uses and SHALL NOT permit branded local declarations, arbitrary member names, or unrelated literals. Exposure SHALL be determined from supported callers and consumers, not solely from whether the interactive UI displays the name.

#### Scenario: A key is undocumented but consumed outside its owner
- **WHEN** a key is accepted from caller scripts or exported to launched programs and its supported exposure is not yet established
- **THEN** its existing spelling SHALL be preserved under an explicit exposure-review entry until that review establishes its contract
- **AND** lack of documentation SHALL NOT authorize a private-key cutover

#### Scenario: Add a private worker setting
- **WHEN** implementation introduces an owned worker or automation environment key
- **THEN** its canonical spelling SHALL be brand-neutral and its producer and consumer SHALL use the same declared contract

#### Scenario: Add or broaden an exception
- **WHEN** a pull request adds an external-key exception or a legacy private alias
- **THEN** governance SHALL require an exact contract, owning boundary, and compatibility or exposure justification
- **AND** a broad `A1_*` allowance SHALL fail validation

#### Scenario: Inspect compatibility retention
- **WHEN** a legacy private spelling is still accepted or emitted
- **THEN** its inventory SHALL identify the canonical replacement and supported older caller or target that requires it
- **AND** removal SHALL require evidence that supported cross-version paths no longer depend on it
