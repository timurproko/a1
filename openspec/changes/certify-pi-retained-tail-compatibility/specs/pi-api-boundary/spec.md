## ADDED Requirements

### Requirement: Published Pi session compatibility is proven behaviorally
Before A1 adopts or certifies a Pi dependency candidate for retained-checkpoint support, validation SHALL exercise the candidate's documented public APIs from its immutable published package against independent retained-tail, empty-tail, legacy, mixed-format, and branched-session fixtures. The expected retained messages SHALL be specified independently of the candidate's actual output. Documentation claims, semantic-version ordering, type declarations, or the mere presence of exports SHALL NOT substitute for executable behavioral evidence. Required typed APIs and their runtime behavior SHALL agree for the capability being certified.

#### Scenario: Documentation promises a capability the package omits
- **WHEN** a candidate documents retained tails but its published runtime returns summary-only context for a valid retained-tail fixture
- **THEN** the candidate SHALL fail session compatibility and SHALL NOT become the accepted A1 dependency

#### Scenario: Source is corrected but the published artifact is stale
- **WHEN** upstream source passes retained-tail tests but the published package used by A1 does not
- **THEN** certification SHALL fail against that published artifact regardless of source-level evidence

#### Scenario: Corrected exact candidate passes
- **WHEN** one published candidate restores the independent fixtures and passes the existing required API, extension, settings, TUI/module-identity, packaging, and session lifecycle gates
- **THEN** A1 SHALL record its exact package/lockfile authority and matching compatibility evidence before releasing the capability

### Requirement: An unavailable upstream session fix remains an explicit dependency blocker
If no corrected public Pi package satisfies the retained-checkpoint contract, A1 SHALL record the unavailable capability and leave dependency adoption blocked. It SHALL NOT select an unverified newer version, mutate installed dependencies, use private imports or prototype replacement, convert users' files to conceal the incompatibility, or weaken retained-history acceptance to make the candidate pass. The independent CLI resume change SHALL NOT be declared complete on the basis of this proposal or an upstream source change alone.

#### Scenario: All inspected candidates still fail
- **WHEN** every available candidate omits retained-tail messages
- **THEN** A1 SHALL keep its accepted dependency authority unchanged and report that a corrected published candidate is still required

#### Scenario: A workaround requires owning compaction behavior
- **WHEN** the proposed solution requires A1 to reimplement or rewrite session compaction rather than consume a corrected public Pi capability
- **THEN** that alternative SHALL require a separate explicit design and approval rather than become an implicit exception in this compatibility change

#### Scenario: Resume implementation requests an unblock
- **WHEN** `fix-cli-session-resume` is evaluated after this compatibility change
- **THEN** its retained-history task SHALL require passing evidence from the corrected, integrated dependency and its own installed-command round trip; completed planning or version selection alone SHALL not satisfy it
