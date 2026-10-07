## ADDED Requirements

### Requirement: Publication Windows full validation is sharded and reconstructed

Nightly and stable-candidate publication validation SHALL execute each supported Windows runtime's canonical `full-release` plan through the reviewed `core`, `resource`, `rendering`, and `package` hosted-runner shards. Every canonical command and test invocation SHALL belong to exactly one shard. Each shard SHALL bind the one exact package artifact selected by the publication plan to the exact source, version, runtime, run, attempt, canonical-plan digest, assigned work, and local verified build prerequisite.

Only the package shard SHALL prepare the exact package installation, enable Defender for measured startup, and execute package startup, contracts, and published-predecessor owners. A Windows publication lane SHALL be successful only after all four current-run shard results reconstruct one complete `a1-validation-outcomes-v1` result in canonical order. Missing, duplicate, stale, malformed, failed, cancelled, wrong-plan, cross-runtime, or incomplete shard evidence SHALL prevent both the lane and publication validation aggregate from succeeding. No shard result alone SHALL authorize candidate success or publication.

Linux and macOS publication full validation MAY remain sequential. Bounded development publication SHALL retain its reviewed non-full lane plan rather than scheduling four Windows shards. Final stable publication SHALL continue adopting the exact successful candidate-validation package pair without rebuilding or rerunning candidate validation. Post-publication smoke SHALL retain the complete platform/runtime matrix independently of the validation execution shape.

#### Scenario: Stable candidate validates Windows
- **WHEN** candidate validation selects `full-release` for Windows Node 22 and Node 24
- **THEN** each runtime SHALL schedule `core`, `resource`, `rendering`, and `package` shards from one canonical plan
- **AND** the candidate result SHALL require both reconstructed Windows lanes alongside the unchanged Linux and macOS results

#### Scenario: A publication shard is incomplete
- **WHEN** one expected Windows shard is missing, duplicated, stale, malformed, unsuccessful, belongs to another runtime or plan, or omits assigned work
- **THEN** no successful complete lane SHALL be produced for that runtime
- **AND** the publication validation aggregate SHALL fail with available shard and owner evidence

#### Scenario: Development preview validation runs
- **WHEN** development mode selects package smoke and installation rather than `full-release`
- **THEN** it SHALL retain the reviewed sequential Node 24 platform lanes without scheduling the four-shard Windows plan
- **AND** complete Windows Node 22/24 coverage SHALL remain in nightly, candidate, and Full regression cadence

#### Scenario: Stable publication adopts its candidate
- **WHEN** an authorized stable publication uses a successful exact-source, exact-version candidate run
- **THEN** stable publication SHALL retain its intentional validation skip and adopt the candidate-validated package pair
- **AND** the candidate run's reconstructed Windows lanes SHALL remain mandatory evidence rather than being replaced by a shard or a new stable build

#### Scenario: Published packages are smoked
- **WHEN** publication proceeds after validation or candidate adoption
- **THEN** post-publication smoke SHALL retain every platform/runtime lane selected before Windows validation was sharded
- **AND** a sequential-validation matrix that excludes Windows SHALL NOT narrow that smoke coverage
