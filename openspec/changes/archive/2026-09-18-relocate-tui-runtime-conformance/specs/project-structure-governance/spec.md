## MODIFIED Requirements

### Requirement: Every production module has one current owner
Each production source file SHALL belong to one named foundation area or feature and SHALL implement a current contract exercised by production entry points or an explicitly retained public boundary. Code SHALL NOT remain solely for historical reference, speculative reuse, superseded architecture, or a deferred change. A subsystem whose OpenSpec change is on hold SHALL be removed from the active tree and preserved on a named archive branch recorded in that change, and the owner registry, validation registries, control-store schema, and documentation SHALL stop describing it as present. A probe or fixture that only tests consume SHALL live under `test/support/` rather than in the production tree, and the architecture gate's unreachable-module allowlist SHALL be empty.

#### Scenario: Audit finds an unreachable module
- **WHEN** a production module has no current entry-point reachability, public consumer, or active contract
- **THEN** the baseline consolidation SHALL delete it or move the required behavior under a current owner rather than retaining it as dormant code

#### Scenario: Historical implementation is useful for reference
- **WHEN** removed behavior may help a future investigation
- **THEN** Git/OpenSpec history SHALL remain the reference and the obsolete implementation SHALL not remain in the active production tree

#### Scenario: A deferred subsystem is archived
- **WHEN** an OpenSpec change is placed on hold with its implementation already in the tree
- **THEN** the implementation, its tests, its owner and validation registry entries, and its persisted schema SHALL be removed from `develop`
- **AND** the change SHALL record the archive branch and commit so resumption starts from the current codebase with that copy available for reference

#### Scenario: A production module exists only for a test
- **WHEN** a module under `src/` is reached by no production entry point and its only consumer is a test
- **THEN** it SHALL move under `test/support/` and import the code it exercises through the owner's public entry, and the unreachable-module allowlist SHALL NOT retain an entry for it
