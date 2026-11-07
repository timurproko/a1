## ADDED Requirements

### Requirement: Production exports have production consumers
Every symbol exported from a production module under `src/` SHALL have an importer under `src/`, `bin/`, or `scripts/`, except symbols listed by an owner's public entry, declared entry modules, and vendored sources. A symbol exported only so a test can reach it SHALL instead be private, and the test SHALL prove the behaviour through the owner's public entry or an observable result. The architecture gate SHALL fail naming each export that has no production consumer.

#### Scenario: An export loses its last production consumer
- **WHEN** a change removes the last production import of an exported symbol
- **THEN** the architecture gate SHALL fail and name the module and symbol
- **AND** the change SHALL remove the export or make it private

#### Scenario: A test needs an internal value
- **WHEN** a test would import a constant or helper that production code does not export for its own use
- **THEN** the test SHALL assert the observable behaviour that value produces instead
- **AND** the production module SHALL NOT gain an export for the test

## MODIFIED Requirements

### Requirement: Features are cohesive and expose one public entry
Each product feature SHALL own its implementation, tests, settings contract, and feature documentation under a recognizable feature name. Cross-feature production imports SHALL use the provider's public entry or an explicit foundation contract; consumers SHALL NOT deep-import another feature's private internals. Every owner's public entry SHALL list its exports by name rather than re-export whole modules, so the contract is readable in one place. Only the composition root MAY reach past a provider's public entry, with one further case: a module on the eager startup path MAY import a leaf of a provider whose public entry is a prohibited startup entry, because loading that barrel would pull the provider's whole graph into startup. The interactive session shell SHALL be an application-layer owner under `src/app` that composes the contracts, the vendor-neutral UI foundations, and the feature owners, and only composition SHALL import it; the shell SHALL receive vendor presentation through ports that composition injects and SHALL NOT import the Pi adapters. Three layer boundaries SHALL hold regardless of the owner dependency graph: contracts import nothing outside their own contract, vendor-neutral UI components import only contracts, and only the Pi adapters and the shipped entry scripts import the pinned Pi packages.

#### Scenario: New feature is introduced
- **WHEN** a feature adds multiple implementation files or owns settings
- **THEN** those files SHALL be grouped under one feature directory with a thin public entry and private internals

#### Scenario: Another feature needs a capability
- **WHEN** one feature consumes behavior owned by another
- **THEN** the dependency SHALL pass through the provider's declared public contract and architecture checks SHALL reject private deep imports

#### Scenario: A public entry re-exports a whole module
- **WHEN** an owner's `index.ts` contains `export *`
- **THEN** the architecture check SHALL reject it and name the entry, so the owner lists its exports by name

#### Scenario: A startup module needs one leaf of a prohibited barrel
- **WHEN** a module on the eager startup path imports a private module of a provider whose public entry is a prohibited startup entry
- **THEN** the architecture check SHALL accept that import, and SHALL reject the same import from a module that is not on the startup path or whose provider's entry is not prohibited

#### Scenario: A layer boundary is crossed
- **WHEN** a contract imports anything outside its own contract, a UI component imports anything but a contract, or a module outside the Pi adapters imports a pinned Pi package
- **THEN** the architecture check SHALL reject the import even when the owner dependency graph would allow the owners involved

#### Scenario: The shell imports a Pi adapter
- **WHEN** a module under `src/app` imports any module under `src/integrations/pi`
- **THEN** the architecture check SHALL reject the import and name the module, with no exemption for the session shell

### Requirement: Tests prove current contracts without duplicating implementation
Every retained test SHALL identify a current contract and the smallest independent boundary capable of proving it. Tests SHALL NOT be retained for deleted behavior, historical bug names alone, private implementation shape, duplicated assertions already covered at a stronger boundary, or self-modelled terminal behavior. A validation tier SHALL NOT perform an equivalent complete-repository documentation scan twice or reproduce an equivalent rendering producer/mode/workload matrix solely because separate test files consume different assertions; one authoritative captured result SHALL support all applicable assertions at that boundary. A governance test SHALL prove its gate with a violating fixture and a conforming fixture and SHALL NOT assert the wording of documentation, workflow definitions, or project configuration; an invariant about such a file SHALL live in the governance script that owns it. Governance tests SHALL compare repository text with line endings normalised so they pass on every supported checkout.

#### Scenario: Multiple tests prove the same contract
- **WHEN** two tests exercise the same cause and observable outcome without distinct boundary risk
- **THEN** the baseline audit SHALL retain the clearest minimal test and remove or consolidate the redundant test

#### Scenario: Confirmed regression still has a live cause
- **WHEN** a historical regression maps to a current deterministic contract
- **THEN** its test SHALL be expressed under the current owner and named for the invariant rather than the obsolete implementation story

#### Scenario: Test belongs to deferred physical certification
- **WHEN** a test or fixture exists only to implement future physical-host automation
- **THEN** it SHALL be removed from the active baseline or moved into the separately authorized future change and SHALL not run on ordinary workstations or preview gates

#### Scenario: Documentation command and repository baseline overlap
- **WHEN** an authoritative documentation command already evaluates the selected repository scope in a validation tier
- **THEN** the ordinary Vitest remainder SHALL retain fixture-based policy tests but SHALL NOT repeat the same repository-wide baseline scan

#### Scenario: Rendering assertions share one workload result
- **WHEN** semantic parity, terminal paint, determinism, and damage budgets require the same rendering producer/mode/workload matrix
- **THEN** the gate SHALL capture that matrix once and SHALL evaluate every applicable assertion from the shared evidence

#### Scenario: A test asserts documentation wording
- **WHEN** a test under the governance owner asserts that a Markdown document, workflow file, or project configuration contains a sentence
- **THEN** the baseline audit SHALL remove the test
- **AND** any invariant it carried SHALL be checked by the owning governance script with a fixture case

#### Scenario: A checkout uses platform line endings
- **WHEN** governance tests run on a checkout whose text files carry carriage returns
- **THEN** every retained governance test SHALL pass without modification
