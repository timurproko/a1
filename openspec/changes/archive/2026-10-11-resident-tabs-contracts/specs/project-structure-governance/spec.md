## MODIFIED Requirements

### Requirement: Every production module has one current owner
Each production source file SHALL belong to one named foundation area or feature and SHALL implement a current contract exercised by production entry points or an explicitly retained public boundary. Code SHALL NOT remain solely for historical reference, speculative reuse, superseded architecture, or a deferred change. A subsystem whose OpenSpec change is on hold SHALL be removed from the active tree and preserved at a commit recorded in that change, optionally also on a named archive branch, and the owner registry, validation registries, control-store schema, and documentation SHALL stop describing it as present. A probe or fixture that only tests consume SHALL live under `test/support/` rather than in the production tree, and the architecture gate's unreachable-module allowlist SHALL be empty.

#### Scenario: Audit finds an unreachable module
- **WHEN** a production module has no current entry-point reachability, public consumer, or active contract
- **THEN** the baseline consolidation SHALL delete it or move the required behavior under a current owner rather than retaining it as dormant code

#### Scenario: Historical implementation is useful for reference
- **WHEN** removed behavior may help a future investigation
- **THEN** Git/OpenSpec history SHALL remain the reference and the obsolete implementation SHALL not remain in the active production tree

#### Scenario: A deferred subsystem is archived
- **WHEN** an OpenSpec change is placed on hold with its implementation already in the tree
- **THEN** the implementation, its tests, its owner and validation registry entries, and its persisted schema SHALL be removed from `develop`
- **AND** the change SHALL record the commit that holds the removed copy, and any archive branch, so resumption starts from the current codebase with that copy available for reference

#### Scenario: A production module exists only for a test
- **WHEN** a module under `src/` is reached by no production entry point and its only consumer is a test
- **THEN** it SHALL move under `test/support/` and import the code it exercises through the owner's public entry, and the unreachable-module allowlist SHALL NOT retain an entry for it

#### Scenario: A held plan is retired
- **WHEN** the maintainer retires a held OpenSpec change instead of resuming it
- **THEN** the change SHALL be archived with an acceptance record that certifies none of its tasks
- **AND** evidence that current documentation or governance still references SHALL move to a scanned documentation path rather than into the archive

### Requirement: Transparent and composed scope remain explicit
The transparent baseline SHALL support one direct full-viewport foreground terminal session and SHALL NOT claim A1-managed arbitrary-CLI tabs, resident terminal surfaces, input routing among internal tabs, or visual reconnection. Bare `a1` SHALL evolve into the multi-agent UX only through resident terminal-session tabs, in which every tab runs the complete A1 UI as its own process under the native resident terminal host described in `docs/architecture/resident-tabs.md`, delivered as sequenced milestone changes behind the opt-in `residentTabs` setting. Structured or message-based agent workers SHALL NOT be reintroduced without a new approved plan. Arbitrary interactive CLI tabs and split layouts SHALL each require their own approved change that extends the resident host and defines its own certification, rather than modifying transparent mode or reviving raw relay experiments implicitly.

#### Scenario: Product planning requests multiple arbitrary CLI tabs
- **WHEN** the bare-`a1` multi-agent UX needs inactive interactive CLIs to remain resident and switchable inside A1
- **THEN** planning SHALL introduce a separate approved change that extends the resident terminal host rather than modifying transparent mode or reactivating raw relay experiments implicitly

#### Scenario: Multi-agent planning begins
- **WHEN** a multi-agent milestone is planned or implemented
- **THEN** it SHALL follow the resident-tabs roadmap, keep `residentTabs` off by default until its certification change, and preserve `a1 pi` as the prerelease Pi comparison without resident infrastructure
