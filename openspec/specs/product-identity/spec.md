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
User-facing product configuration SHALL retain `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, and every other setting the naming policy classifies as public, integration, or under exposure review. Private process coordination, tests, and automation SHALL use descriptive environment keys whose spellings do not contain `a1`, case-insensitively; the private launch context SHALL be written under the `LAUNCH_CONTEXT_*` keys. The superseded launch keys `A1_RELEASE_ROOT`, `A1_RELEASE_ID`, `A1_RELEASE_DIGEST`, `A1_RELEASE_LAYERS`, `A1_LAUNCH_PROFILE`, and `A1_IMMUTABLE_WARMUP` SHALL remain a declared integration boundary with already-installed releases: they SHALL be read only as a per-field fallback behind the current keys and written only for a retained release that declares no launch contract, as the `cli-self-update` capability specifies. No other private key SHALL have a second spelling. Default Windows and Unix control-state directory resolution SHALL retain the product namespace. A1 SHALL NOT read variables or control-state directories using the former product identity. A1 SHALL retain `~/.a1/agent` for its profile and preserve the comparison launch's ordinary `~/.pi/agent` resolution.

#### Scenario: Override A1 state roots
- **WHEN** the user supplies valid `A1_CONFIG_DIR`, `A1_DATA_DIR`, and `A1_RUNTIME_DIR` values
- **THEN** A1 SHALL use those values for its control state and SHALL leave profile-root selection unchanged

#### Scenario: Supply only a legacy environment variable
- **WHEN** the environment supplies only a variable using the former product prefix without the corresponding supported current setting
- **THEN** A1 SHALL ignore the former-product variable and resolve the normal A1 default

#### Scenario: Resolve default state paths
- **WHEN** no A1 state override is supplied
- **THEN** A1 SHALL resolve platform-appropriate defaults containing the `A1` or `a1` product namespace

#### Scenario: A current and a superseded launch key disagree
- **WHEN** a process receives a launch-context field under both its `LAUNCH_CONTEXT_*` key and its superseded `A1_*` key
- **THEN** the `LAUNCH_CONTEXT_*` value SHALL be used

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

### Requirement: Historical identity references remain factual and isolated
Archived changes, immutable historical evidence, and explicit obsolete-package rejection or deprecation fixtures MAY contain former identity literals such as `@timurproko/addone`. Such references SHALL NOT be imported, rendered, generated, or accepted as current A1 identity.

#### Scenario: Scan current repository surfaces
- **WHEN** repository governance scans production code, scripts, workflows, tests, current documentation, main specs, and non-archived changes
- **THEN** every legacy identity occurrence SHALL either be absent or belong to an explicit rejection/deprecation fixture or approved historical location

#### Scenario: Preserve archived evidence
- **WHEN** a historical record accurately names the product identity used when it was created
- **THEN** the record SHALL remain unchanged and SHALL be excluded from current-identity generation paths

### Requirement: Files and code identifiers are named for what they do, not for the product
Internal constants, variables, parameters, functions, methods, classes, interfaces, types, enums, and members in tracked scripts, Python, configuration, and shell sources SHALL NOT contain the substring `a1`, matched case-insensitively, including in private names, aliases, destructuring bindings, and quoted or statically known computed member names; `node scripts/governance/product-identifier-policy.mjs --check` SHALL fail on any such name. A file under `bin`, `src`, `scripts`, `test`, `docs`, or `config` whose file name contains `a1` as a separate token SHALL fail `node scripts/governance/check-architecture.mjs`, and the failure SHALL name the file.

The product name SHALL remain where users or independently versioned consumers address A1: the installed command `a1`, npm package identity, declared environment keys, user-state paths, declared protocol and evidence schemas, and user-visible output. A branded environment key SHALL be accepted in source only when the naming policy declares that exact key with public, integration, or review exposure. A branded member name SHALL be accepted only when the policy declares that exact name for that exact file. An `A1_*` property spelling alone SHALL NOT grant an exemption.

#### Scenario: Add an entry point or executable
- **WHEN** a file is added or renamed under `bin`, `src`, `scripts`, `test`, `docs`, or `config`
- **THEN** its file name SHALL describe its role, such as `cli`, `ui`, `activate`, `warmup`, or `release-cleanup`, and SHALL NOT contain the product name as a token

#### Scenario: Name a source identifier
- **WHEN** an internal declaration or member is introduced or changed
- **THEN** its name SHALL describe its role without a case-insensitive `a1` substring
- **AND** storing an external branded value SHALL NOT permit a branded internal name

#### Scenario: Address A1 from outside
- **WHEN** a user runs the command, npm resolves the package, the runtime reads a declared environment key or state directory, or a program reads a declared protocol or evidence schema
- **THEN** the product spelling SHALL remain because it is an external address rather than internal structure

#### Scenario: Inspect the repository for product-named files
- **WHEN** the architecture check scans file names under its roots
- **THEN** a file name containing the product name as a token SHALL fail the check, and the failure SHALL name the file

#### Scenario: Hide branding in a different identifier form
- **WHEN** a source file contains an internal lowercase embedded name, private member, quoted method, or branded local alias
- **THEN** the naming check SHALL reject it regardless of casing or declaration syntax

#### Scenario: Use an arbitrary uppercase property
- **WHEN** an internal object or type declares an `A1_*` property that the naming policy does not declare
- **THEN** the naming check SHALL reject it rather than treating it as an environment setting

#### Scenario: Retain an existing serialized key
- **WHEN** a persisted or externally consumed record requires a branded field spelling
- **THEN** the naming policy SHALL declare that member name for the file that owns the boundary, and the name SHALL be accepted only there

### Requirement: Environment keys are declared in one exact naming policy
`config/internal-naming-policy.json` SHALL be the single declaration of owned environment keys and branded member exceptions, and the naming check SHALL refuse to run its inspection when the policy is invalid. Each environment entry SHALL carry exactly a unique logical role, a unique key, an exposure, an owner, an evidence path, and value semantics, with no other field. Exposure SHALL be one of `public`, `integration`, `review`, `private`, `automation`, or `test`. A key with `private`, `automation`, or `test` exposure SHALL NOT contain `a1`, case-insensitively. Owner, evidence, and semantics SHALL be non-empty and free of wildcard characters, and the owner and evidence files SHALL be tracked. The evidence file of a `public` key SHALL contain that key. A member exception SHALL carry exactly a name, a tracked path, and a reason, SHALL contain no wildcard, and SHALL NOT begin with `A1_`.

#### Scenario: A private key is branded
- **WHEN** the policy declares a `private`, `automation`, or `test` key whose spelling contains `a1`
- **THEN** the naming check SHALL fail before inspecting any source

#### Scenario: An entry carries an alias
- **WHEN** an environment entry has a field other than role, key, exposure, owner, evidence, and semantics, or repeats a role or key
- **THEN** the naming check SHALL fail

#### Scenario: A public key is undocumented
- **WHEN** the evidence file declared for a `public` key does not contain that key
- **THEN** the naming check SHALL fail and name the key

#### Scenario: An exception is broad
- **WHEN** a member exception uses a wildcard, names an untracked file, or begins with `A1_`
- **THEN** the naming check SHALL fail
