## MODIFIED Requirements

### Requirement: Features are cohesive and expose one public entry
Each product feature SHALL own its implementation, tests, settings contract, and feature documentation under a recognizable feature name. Cross-feature production imports SHALL use the provider's public entry or an explicit foundation contract; consumers SHALL NOT deep-import another feature's private internals. Every owner's public entry SHALL list its exports by name rather than re-export whole modules, so the contract is readable in one place. Only the composition root MAY reach past a provider's public entry, with one further case: a module on the eager startup path MAY import a leaf of a provider whose public entry is a prohibited startup entry, because loading that barrel would pull the provider's whole graph into startup. The interactive session shell SHALL be an application-layer owner under `src/app` that composes the contracts, the vendor-neutral UI foundations, the Pi adapters, and the feature owners, and only composition SHALL import it. Three layer boundaries SHALL hold regardless of the owner dependency graph: contracts import nothing outside their own contract, vendor-neutral UI components import only contracts, and only the Pi adapters and the shipped entry scripts import the pinned Pi packages.

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
