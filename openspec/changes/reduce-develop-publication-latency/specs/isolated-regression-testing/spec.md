## ADDED Requirements

### Requirement: Shared exact-package preparation preserves fixture independence
An exact candidate's immutable clean installation MAY supply multiple validation owners within one platform/runtime lane only when every owner receives fresh mutable configuration, data, runtime, endpoint, process, and cleanup state. Consumers SHALL treat the installed package as read-only, SHALL verify its candidate identity before use, and SHALL NOT leave changes that affect another consumer. Owner execution order SHALL NOT serve as an oracle or prerequisite unless the suite contract explicitly declares that dependency.

A first-attempt startup consumer SHALL remain cold with respect to product launch, release materialization, certification, warmup, supervisor state, compile caches, and profile state. Reusing downloaded dependency bytes or the immutable installed package SHALL NOT count as a prior launch and SHALL NOT permit startup evidence produced by another owner. Cleanup SHALL remove or safely defer only owner-specific mutable state and SHALL preserve the primary failure when cleanup also fails.

#### Scenario: Contract and startup owners consume one installation
- **WHEN** package-contract and startup owners use one verified installed package in a publication lane
- **THEN** they SHALL use distinct mutable roots and owned process trees
- **AND** neither owner's mutations or cleanup SHALL affect the other's assertions or outcome

#### Scenario: Startup consumes shared preparation
- **WHEN** the startup owner receives an immutable package installation previously inspected by a contract owner
- **THEN** its first measured launch SHALL still begin without prior product launch, materialization, certification, warmup, supervisor, or mutable compile-cache state
- **AND** all first-attempt budgets and assertions SHALL remain unchanged and execute without retry

#### Scenario: A consumer mutates the installed package
- **WHEN** an owner changes installed package bytes or identity evidence before another owner consumes them
- **THEN** identity verification SHALL fail before the later owner's assertions can pass
- **AND** publication SHALL remain blocked

#### Scenario: Owner cleanup encounters contention
- **WHEN** one consumer cannot immediately remove its mutable fixture state
- **THEN** cleanup SHALL remain bounded and attributable to that owner
- **AND** it SHALL not delete the shared immutable preparation or another owner's mutable state
