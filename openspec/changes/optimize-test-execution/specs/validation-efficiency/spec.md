## ADDED Requirements

### Requirement: Equivalent validation work executes once
Validation SHALL execute each equivalent producer workload once per gate and use its captured result for all applicable assertions. Full rendering/input validation SHALL supersede smoke capture without losing smoke-only assertions or scheduled-content contracts.

#### Scenario: Full rendering is selected
- **WHEN** a complete plan selects full rendering and input evidence
- **THEN** it SHALL not separately recapture smoke workloads or repeat equivalent scheduled-content checks
- **AND** every unique smoke assertion SHALL consume retained captures or deterministic fixtures

### Requirement: Pull requests execute bounded critical ownership
Every coarse owner SHALL declare a bounded critical test floor. Pull-request selection SHALL combine the mandatory core, critical floors for affected owners, directly changed tests, and statically reachable consumers. It SHALL NOT select an owner's complete retained population merely because one owned source path changed. Unknown paths, invalidators, unavailable comparison, or unavailable dependency information SHALL select every critical floor or block, rather than silently skip or expand to the complete test repository. Changed tests, shared support consumers, and both rename identities SHALL remain covered.

#### Scenario: A localized path is refined
- **WHEN** complete trusted selection matches a reviewed subarea
- **THEN** its declared consumers and mandatory PR core SHALL remain selected without unrelated coarse tests

#### Scenario: Selection cannot establish precise impact
- **WHEN** a changed path or consumer cannot be interpreted precisely
- **THEN** selection SHALL retain the mandatory core and every applicable critical floor or block
- **AND** exhaustive retained tests SHALL remain owned by Full, nightly, and release cadence

### Requirement: Optimized fixtures preserve independent scenarios
Fixture optimization SHALL preserve real exercised operations, fresh mutable scenario state, bounded failure-safe cleanup, original deadlines, independent parity oracles, and platform/runtime distinctions. Exact-package preparation SHALL remain receipt-bound within a lane with fresh installation prefixes, independent shard state, and pre/post consumer identity checks.

#### Scenario: Independent command cases are batched
- **WHEN** command capture shares process initialization for independent cases
- **THEN** each case SHALL retain its controlled settings, environment, exact transcript, and failure result without cross-case mutable state

#### Scenario: Exact-package work is reused
- **WHEN** a lane avoids repeated package preparation work
- **THEN** reuse SHALL require the existing exact-source and candidate identity authority
- **AND** it SHALL not remove consumer checks, share installed state across shards, or retry failed evidence

### Requirement: Expensive boundaries use direct or exhaustive cadence
Integration, rendering, native, chaos, performance, package, and platform permutations SHALL run on an ordinary pull request only when their reviewed production, test, or support surfaces are directly affected, except for explicitly declared critical pull-request boundaries. Conservative fallback SHALL retain critical boundaries without scheduling direct-impact or exhaustive owners. Full, nightly, and release workflows SHALL retain complete declared coverage.

#### Scenario: Validation authority changes
- **WHEN** a pull request changes validation selection or suite policy without changing a product boundary
- **THEN** it SHALL execute bounded critical policy coverage
- **AND** it SHALL NOT schedule unrelated native-host, chaos, compatibility, package, or full-rendering work

#### Scenario: An expensive boundary changes directly
- **WHEN** a declared production, test, or support surface for a direct-impact owner changes
- **THEN** that owner SHALL run on its declared platform and runtime targets

### Requirement: Failed pull requests stop consuming matrix capacity
The Development matrix SHALL cancel remaining entries after a decisive job failure. Missing, cancelled, or failed selected evidence SHALL continue to block the protected aggregate.

#### Scenario: A critical job fails
- **WHEN** one Development matrix entry fails
- **THEN** remaining in-progress or queued matrix entries SHALL be cancelled where the workflow platform permits
- **AND** the aggregate SHALL remain failed rather than treating cancellation as successful evidence

### Requirement: Validation savings remain auditable
Validation cost reports SHALL identify current inventory/source and observed evidence context, distinguish setup from execution and critical path from runner time, and expose unavailable measurements. Every consolidated case SHALL identify retained equivalent coverage; uncertain overlap SHALL remain covered.

#### Scenario: An optimization is reported
- **WHEN** the change reports reduced validation work
- **THEN** structural reductions SHALL remain distinguishable from measured hosted elapsed improvements
- **AND** unexecuted or older-head evidence SHALL not be represented as successful current-head validation
