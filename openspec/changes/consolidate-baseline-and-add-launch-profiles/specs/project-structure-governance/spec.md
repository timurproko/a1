## Purpose

Defines enforceable repository ownership, dependency, testing, documentation, and hygiene rules that keep the accepted AddOne baseline small as independent features are added.

## ADDED Requirements

### Requirement: Every production module has one current owner
Each production source file SHALL belong to one named foundation area or feature and SHALL implement a current contract exercised by production entry points or an explicitly retained public boundary. Code SHALL NOT remain solely for historical reference, speculative reuse, superseded architecture, or a deferred change.

#### Scenario: Audit finds an unreachable module
- **WHEN** a production module has no current entry-point reachability, public consumer, or active contract
- **THEN** the baseline consolidation SHALL delete it or move the required behavior under a current owner rather than retaining it as dormant code

#### Scenario: Historical implementation is useful for reference
- **WHEN** removed behavior may help a future investigation
- **THEN** Git/OpenSpec history SHALL remain the reference and the obsolete implementation SHALL not remain in the active production tree

### Requirement: Features are cohesive and expose one public entry
Each product feature SHALL own its implementation, tests, settings contract, and feature documentation under a recognizable feature name. Cross-feature production imports SHALL use the provider's public entry or an explicit foundation contract; consumers SHALL NOT deep-import another feature's private internals.

#### Scenario: New feature is introduced
- **WHEN** a feature adds multiple implementation files or owns settings
- **THEN** those files SHALL be grouped under one feature directory with a thin public entry and private internals

#### Scenario: Another feature needs a capability
- **WHEN** one feature consumes behavior owned by another
- **THEN** the dependency SHALL pass through the provider's declared public contract and architecture checks SHALL reject private deep imports

### Requirement: Foundation areas remain product-agnostic
Shared lifecycle, protocol, release, storage, supervision, and terminal-attachment foundations SHALL not import product features or select behavior from Pi identity, extension identity, executable text, arguments, or visible terminal content. A generic `core`, `common`, `utils`, or `misc` area SHALL NOT become an unowned dumping ground.

#### Scenario: Feature requires shared logic
- **WHEN** logic is needed by multiple features
- **THEN** it SHALL move to a specifically named foundation contract only when it is product-agnostic and has more than one real owner

#### Scenario: Helper has one consumer
- **WHEN** a helper is used by only one feature and expresses that feature's policy
- **THEN** it SHALL remain private to that feature rather than being promoted to a generic shared area

### Requirement: The repository has one dependency authority
AddOne SHALL use one repository-level package manifest, lockfile, and dependency installation for TypeScript production and test code. Feature source directories SHALL NOT contain nested `node_modules`, independent lockfiles, vendored runtime caches, generated logs, sessions, browser profiles, or package-manager state.

#### Scenario: Feature needs a package
- **WHEN** a feature introduces an external dependency
- **THEN** the dependency SHALL be reviewed and declared through the repository-level manifest and lockfile

#### Scenario: Generated runtime data appears in source
- **WHEN** a feature creates logs, sessions, caches, downloaded packages, browser data, or compiled output
- **THEN** it SHALL write to an ignored runtime/artifact location outside tracked feature source and repository policy SHALL reject accidental inclusion

### Requirement: Tests prove current contracts without duplicating implementation
Every retained test SHALL identify a current contract and the smallest independent boundary capable of proving it. Tests SHALL NOT be retained for deleted behavior, historical bug names alone, private implementation shape, duplicated assertions already covered at a stronger boundary, or self-modelled terminal behavior.

#### Scenario: Multiple tests prove the same contract
- **WHEN** two tests exercise the same cause and observable outcome without distinct boundary risk
- **THEN** the baseline audit SHALL retain the clearest minimal test and remove or consolidate the redundant test

#### Scenario: Confirmed regression still has a live cause
- **WHEN** a historical regression maps to a current deterministic contract
- **THEN** its test SHALL be expressed under the current owner and named for the invariant rather than the obsolete implementation story

#### Scenario: Test belongs to deferred physical certification
- **WHEN** a test or fixture exists only to implement future physical-host automation
- **THEN** it SHALL be removed from the active baseline or moved into the separately authorized future change and SHALL not run on ordinary workstations or preview gates

### Requirement: Documentation carries cross-cutting rationale
Cross-cutting architecture, feature contracts, operational procedures, and irreversible decisions SHALL live in concise maintained documents under `docs/architecture` or `docs/features`. Documentation SHALL describe current behavior and limitations rather than narrating milestone history that is already available in Git/OpenSpec.

#### Scenario: Architecture decision affects multiple modules
- **WHEN** a non-obvious decision constrains multiple owners or future work
- **THEN** it SHALL be documented once in an architecture document or short decision record and linked from relevant public entries when necessary

#### Scenario: Documentation describes completed redesign as future work
- **WHEN** an audit finds phrases such as `during redesign`, `temporary`, or `will be added later` that no longer match production state
- **THEN** the documentation SHALL be rewritten as a current invariant or removed

### Requirement: Source comments are sparse and purposeful
Source comments SHALL be used only for non-obvious rationale, safety/security invariants, platform constraints not expressible through types, and public contract semantics. Comments SHALL NOT restate code, preserve implementation history, describe obvious control flow, hold commented-out code, or serve as speculative TODO storage.

#### Scenario: Type and name already explain behavior
- **WHEN** a comment merely repeats a function name, branch condition, type, or assignment
- **THEN** the comment SHALL be removed and unclear code SHALL be clarified through naming or decomposition

#### Scenario: Ownership cleanup relies on subtle proof
- **WHEN** safe process cleanup or terminal ownership depends on a non-obvious invariant
- **THEN** a concise rationale comment MAY remain at the enforcement point and the broader rule SHALL live in architecture documentation

### Requirement: Repository governance is executable
Architecture and hygiene rules SHALL be enforced by deterministic checks that report actionable owner/path violations. Checks SHALL cover feature dependency direction, forbidden deep imports, nested package/dependency state, generated artifacts in tracked source, prohibited terminal interception, stale redesign markers in current production documentation, and production files with no declared ownership.

#### Scenario: New code violates a boundary
- **WHEN** a change introduces a forbidden dependency, unowned source location, nested lockfile, or prohibited terminal mechanism
- **THEN** the architecture gate SHALL fail with the offending path and violated rule

#### Scenario: Governance passes
- **WHEN** the complete baseline check runs
- **THEN** every production file, test, document, workflow, and dependency SHALL have a current owner and all mandatory architecture, type, unit, integration, update, package, and release checks SHALL pass

### Requirement: Transparent and composed scope remain explicit
The accepted transparent baseline SHALL support one direct full-viewport foreground terminal session and SHALL not claim AddOne-managed arbitrary-CLI tabs, resident terminal surfaces, input routing among internal tabs, or visual reconnection. Any such arbitrary-CLI multi-tab capability SHALL require a separate composed-terminal change with its own authority and certification plan.

#### Scenario: Product planning requests multiple arbitrary CLI tabs
- **WHEN** a future feature needs inactive interactive CLIs to remain resident and switchable inside AddOne
- **THEN** planning SHALL introduce a separate composed-terminal capability rather than modifying transparent mode or reactivating raw relay experiments implicitly
