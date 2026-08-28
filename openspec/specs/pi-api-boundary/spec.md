# Pi API Boundary Specification

## Purpose

Defines how A1 integrates Pi through vendor-neutral owned contracts and documented public APIs so upgrades fail explicitly at one bounded compatibility boundary rather than spreading Pi assumptions through product features.

## Requirements

### Requirement: Product features depend only on vendor-neutral A1 contracts
Owned UI, workspace, launch policy, and other product features SHALL consume A1-owned engine, session, presentation, component, and terminal-runtime contracts that do not expose Pi package types or require Pi-specific factories. Selection and construction of the Pi implementation SHALL occur only in a composition boundary outside those features.

#### Scenario: Compose a Pi-backed owned session
- **WHEN** A1 selects Pi as the engine for an owned session
- **THEN** the composition boundary SHALL provide implementations of A1-owned ports to the feature without requiring the feature to import or construct a Pi adapter

#### Scenario: Add structured Pi tabs
- **WHEN** the workspace integrates multiple Pi-backed agents
- **THEN** workspace state, routing, persistence, and presentation SHALL remain expressed only through A1 contracts and durable agent identities

#### Scenario: Architecture dependency is violated
- **WHEN** production feature or workspace code imports a Pi package, concrete Pi adapter, Pi-specific component factory, or Pi-named runtime contract
- **THEN** the deterministic architecture gate SHALL fail with the offending path

### Requirement: Repository-global identifiers use semantic roles instead of the product name
All current and future implementation identifiers across production, tooling, native code, tests, and generated source SHALL be named for their architectural or behavioral responsibility. This is a repository-global naming rule, not a Pi-boundary-only convention. The product name SHALL NOT be used as an ownership namespace or generic prefix/suffix for classes, interfaces, functions, variables, fields, or constants, including forms such as `A1OwnedEditor`, `A1Runtime`, `a1Client`, or `a1Manifest`. Exact externally observable identity tokens centralized by product identity governance—such as package names, command/profile literals, state paths, schema values, and `A1_*` environment-variable names—MAY retain the product name, but local bindings that read or write those tokens SHALL remain role-named. A deterministic repository gate SHALL enforce this rule for every subsequent change.

#### Scenario: Product-prefixed implementation identifier is introduced
- **WHEN** source, tooling, native, or test code introduces an internal identifier whose ownership is expressed by an `A1` or `a1` product-name prefix or suffix
- **THEN** deterministic naming governance SHALL fail with the identifier and source path and SHALL require a responsibility-based name

#### Scenario: External product identity token is required
- **WHEN** code must read, write, validate, or test an exact externally observable A1 environment key, command, package name, profile id, state path, or schema value
- **THEN** the exact token MAY remain in a string or centralized identity authority while surrounding implementation identifiers SHALL use semantic role names

#### Scenario: Existing product-prefixed identifiers are assessed
- **WHEN** this boundary change is certified
- **THEN** production, tooling, native, and test identifiers SHALL be scanned and internal product-prefixed names SHALL be renamed without changing externally observable identity contracts

### Requirement: Production Pi integration uses documented public APIs only
Production integration SHALL use documented package-root exports and public entry points. It SHALL NOT deep-import Pi source or distribution modules, inspect dependency package files, derive runtime behavior from dependency directory layout, patch installed code, mutate prototypes, inspect private state, or authorize behavior from distribution hashes.

#### Scenario: Load an upstream theme, asset, documentation item, or changelog presentation
- **WHEN** the owned product needs content not exposed through a documented Pi API
- **THEN** A1 SHALL use an attributed A1-owned resource or omit the optional presentation rather than read a guessed path under the installed Pi package

#### Scenario: A public API is insufficient
- **WHEN** required engine behavior is not available from documented package exports
- **THEN** the compatibility gate SHALL report the unsupported capability and implementation SHALL stop until A1 owns an alternative or Pi exposes a public API

#### Scenario: Non-production provenance tooling inspects upstream source
- **WHEN** source synchronization or license evidence requires upstream paths or source maps
- **THEN** that inspection SHALL remain isolated from shipped production modules and SHALL NOT become a runtime requirement

### Requirement: Pi compatibility is validated explicitly and fails closed
The Pi integration SHALL validate every required capability at adapter construction or at the bounded operation that first requires it. Required engine lifecycle, prompting, queueing, session replacement, models, authentication, settings, resources, extensions, workflows, public components, and TUI behavior SHALL NOT be represented as silently optional merely to tolerate incompatible package shapes.

#### Scenario: Construct a supported adapter
- **WHEN** the selected exact Pi dependency exposes every required public capability with valid shapes
- **THEN** adapter construction and the complete compatibility suite SHALL succeed and publish the supported A1 contract version

#### Scenario: Required API is removed or changed
- **WHEN** a candidate Pi version removes a required export, changes an incompatible shape, or returns malformed data
- **THEN** compatibility validation SHALL fail with the package version, capability, operation, and bounded diagnostic before the affected product surface is released

#### Scenario: Capability is genuinely optional
- **WHEN** A1 supports operation without a nonessential Pi capability
- **THEN** optionality SHALL be represented by an explicit negotiated capability and a tested unavailable outcome rather than method-name probing or a silent default

### Requirement: Public vendor types are adapted once at the integration boundary
The Pi integration SHALL use the selected package's official exported types internally and SHALL convert them once into validated A1 commands, events, snapshots, resources, and presentation inputs. It SHALL NOT bypass compile-time constructor contracts through reflection or satisfy concrete Pi classes with unvalidated structural substitutes.

#### Scenario: Adapt a session event
- **WHEN** Pi emits a documented session event
- **THEN** the integration SHALL validate and convert it to an A1 event before feature or workspace code observes it

#### Scenario: Reuse a public Pi component
- **WHEN** A1 reuses a documented public Pi component
- **THEN** the integration SHALL invoke its public constructor with compile-time-valid public arguments and expose only an A1 component port

#### Scenario: A public component requires concrete stock-root state
- **WHEN** a public component cannot be constructed without a concrete Pi root/session object that A1 does not own
- **THEN** A1 SHALL use a provenance-recorded owned implementation or a different public primitive rather than reflection or a fake concrete object

### Requirement: A1-owned presentation is independent from Pi engine upgrades
Attributed source-derived UI units retained by A1 SHALL be treated as A1-owned baseline code. Updating the Pi engine SHALL NOT automatically require adopting new private Pi interactive source, changing A1 presentation, or regenerating runtime behavior from installed source maps. Any later upstream UI synchronization SHALL be a separate explicit presentation change with provenance and acceptance evidence.

#### Scenario: Evaluate an engine-only Pi upgrade
- **WHEN** a candidate changes public engine behavior but A1 does not select upstream presentation changes
- **THEN** only the Pi integration and compatibility evidence SHALL require migration while accepted A1 feature and presentation contracts remain unchanged

#### Scenario: Adopt an upstream UI improvement
- **WHEN** maintainers choose to synchronize an upstream private UI change
- **THEN** that work SHALL be planned and reviewed as an A1 presentation change independently from engine compatibility

### Requirement: The explicit vanilla oracle uses the selected upstream dependency
`a1 pi` SHALL launch untouched vanilla behavior from the exact upstream Pi dependency selected by A1, through a documented public entry point, in a separately attached child process. The oracle SHALL NOT depend on an ambient executable from `PATH` and SHALL remain separate from the A1-owned UI and workspace.

#### Scenario: Global Pi differs from A1 dependency
- **WHEN** another `pi` executable is absent from `PATH` or has a different version
- **THEN** `a1 pi` SHALL still launch the exact Pi version selected by A1

#### Scenario: Launch explicit vanilla mode
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL start the public Pi entry point in the transparent child path with ordinary Pi configuration and without initializing owned UI, workspace, or composed-terminal infrastructure

#### Scenario: Public child entry point becomes incompatible
- **WHEN** a candidate Pi package no longer provides the required public process entry behavior
- **THEN** candidate compatibility SHALL fail before release rather than falling back to a private distribution path or unrelated global executable

### Requirement: Pi upgrades use one exact compatibility authority and bounded candidate gates
The repository package manifest and lockfile SHALL remain the dependency authority for the exact compatible Pi package family. Version, source-provenance, fixtures, and evidence metadata SHALL be derived from or checked against that authority, and a candidate SHALL pass compile-time, runtime, architecture, workflow, extension, TUI, packaging, explicit-oracle, and regression gates before activation.

#### Scenario: Evaluate a candidate version
- **WHEN** maintainers propose a newer Pi version
- **THEN** an isolated candidate run SHALL report all required adapter migrations and SHALL NOT change the accepted dependency until mandatory compatibility gates pass

#### Scenario: Compatibility metadata drifts
- **WHEN** hardcoded or generated version evidence differs from the package manifest or lockfile
- **THEN** governance SHALL fail with the stale authority rather than allowing mixed Pi versions

#### Scenario: Candidate passes
- **WHEN** every mandatory compatibility, product regression, package, and oracle gate passes against one exact candidate dependency set
- **THEN** A1 MAY update the exact pin without requiring workspace-domain or feature-contract changes

### Requirement: Everything A1 shows about a Pi setting is derived from Pi
A1 SHALL derive the wording, presentation order, offered values, numeric limits, and dialog contents
of every Pi setting it presents from the pinned Pi source, through the generated settings metadata,
and SHALL NOT hold a hand-written copy of any of them. Where Pi states values in a submenu rather than
in its item list, those values SHALL be extracted from that submenu on the same route.

#### Scenario: Pi changes what a setting offers
- **WHEN** the pinned Pi source changes the values, wording, order, or limits of a setting
- **THEN** the governance test SHALL fail until the metadata is regenerated
- **AND** regenerating it SHALL be the only edit required for A1 to present the change

#### Scenario: Values come from a submenu
- **WHEN** Pi offers a setting's values through a submenu rather than an inline list
- **THEN** those values SHALL be extracted from that submenu into the generated metadata

### Requirement: The exposed Pi setting inventory is governed
The set of Pi settings A1 exposes SHALL be checked against the inventory Pi itself presents. A setting
Pi presents that A1 does not map SHALL fail validation and SHALL be named. A setting A1 maps that Pi
no longer presents SHALL fail validation and SHALL be named. The read and write pairing for a setting
SHALL remain written against Pi's typed API rather than resolved by name at runtime, so a renamed Pi
method fails to compile.

#### Scenario: Pi adds a setting
- **WHEN** the pinned Pi presents a setting A1 does not map
- **THEN** validation SHALL fail naming that setting

#### Scenario: Pi removes a setting
- **WHEN** A1 maps a setting the pinned Pi no longer presents
- **THEN** validation SHALL fail naming that setting

### Requirement: Pi value grammar and runtime value lists live on the boundary
Composite Pi values — a single stored value carrying more than one meaning, such as a theme setting
naming one theme per terminal appearance — SHALL be parsed and composed inside the Pi adapter and
SHALL reach the layers above as ordinary contract fields. A value list that can only be resolved while
running, such as the installed themes, SHALL be supplied through a provider declared on the settings
contract. No layer above the boundary SHALL wrap the settings port to add, translate, or interpret Pi
values.

#### Scenario: A Pi setting carries a composite value
- **WHEN** a stored Pi setting encodes more than one meaning
- **THEN** the adapter SHALL present its parts through the contract
- **AND** composition SHALL wire the port without interpreting the value

#### Scenario: Offered values depend on what is installed
- **WHEN** the values a Pi setting accepts depend on what is installed when it is read
- **THEN** the adapter SHALL resolve them through the declared provider at read time
