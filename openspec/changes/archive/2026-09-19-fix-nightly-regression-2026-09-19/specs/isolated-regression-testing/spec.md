## MODIFIED Requirements

### Requirement: A1 releases contain no deprecated dependencies
The exact production, development, build, test, optional, and native dependency graph SHALL contain no package marked deprecated by its registry, except a documented transitive package that the exact pinned Pi carries through its public SDK dependency graph. Each documented exception SHALL name the exact package version, the reason, and the exact pinned Pi under which it was evaluated, and SHALL be re-evaluated, not broadened, when the pinned Pi changes.

#### Scenario: A transitive dependency is deprecated
- **WHEN** registry metadata marks a reachable dependency deprecated
- **THEN** packaging and publication SHALL fail with its dependency path

#### Scenario: The pinned Pi carries a documented deprecated package
- **WHEN** the deprecated package, its version, its reason, and its path beneath the exact pinned Pi match a documented exception
- **THEN** the dependency policy SHALL accept it and SHALL still reject the same package on any other path or version

#### Scenario: The pinned Pi changes
- **WHEN** the pinned Pi version differs from the one a documented exception names
- **THEN** pull-request validation SHALL fail until the exception is re-evaluated against the new pin
