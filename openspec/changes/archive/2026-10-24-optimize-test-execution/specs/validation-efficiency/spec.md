## ADDED Requirements

### Requirement: Equivalent validation work executes once
Validation SHALL execute each equivalent producer workload once per gate and use its captured result for all applicable assertions. Full rendering/input validation SHALL supersede smoke capture without losing smoke-only assertions or scheduled-content contracts.

#### Scenario: Full rendering is selected
- **WHEN** a complete plan selects full rendering and input evidence
- **THEN** it SHALL not separately recapture smoke workloads or repeat equivalent scheduled-content checks
- **AND** every unique smoke assertion SHALL consume retained captures or deterministic fixtures

### Requirement: Reviewed refinements preserve conservative ownership
PR selection MAY narrow a coarse owner for an explicitly reviewed subarea only when its declared tests and integration consumers are retained. Uncovered paths, incomplete authority, invalidators, and unavailable comparison SHALL retain coarse coverage, select complete applicable coverage, or block. Changed tests, shared support consumers, and both rename identities SHALL remain covered.

#### Scenario: A localized path is refined
- **WHEN** complete trusted selection matches a reviewed subarea
- **THEN** its declared consumers and mandatory PR core SHALL remain selected without unrelated coarse tests

#### Scenario: Refinement cannot establish safety
- **WHEN** a changed path or consumer cannot be interpreted by the reviewed refinement
- **THEN** selection SHALL fall back to coarse or complete applicable coverage rather than infer that work is unnecessary

### Requirement: Optimized fixtures preserve independent scenarios
Fixture optimization SHALL preserve real exercised operations, fresh mutable scenario state, bounded failure-safe cleanup, original deadlines, independent parity oracles, and platform/runtime distinctions. Exact-package preparation SHALL remain receipt-bound within a lane with fresh installation prefixes, independent shard state, and pre/post consumer identity checks.

#### Scenario: Independent command cases are batched
- **WHEN** command capture shares process initialization for independent cases
- **THEN** each case SHALL retain its controlled settings, environment, exact transcript, and failure result without cross-case mutable state

#### Scenario: Exact-package work is reused
- **WHEN** a lane avoids repeated package preparation work
- **THEN** reuse SHALL require the existing exact-source and candidate identity authority
- **AND** it SHALL not remove consumer checks, share installed state across shards, or retry failed evidence

### Requirement: Validation savings remain auditable
Validation cost reports SHALL identify current inventory/source and observed evidence context, distinguish setup from execution and critical path from runner time, and expose unavailable measurements. Every consolidated case SHALL identify retained equivalent coverage; uncertain overlap SHALL remain covered.

#### Scenario: An optimization is reported
- **WHEN** the change reports reduced validation work
- **THEN** structural reductions SHALL remain distinguishable from measured hosted elapsed improvements
- **AND** unexecuted or older-head evidence SHALL not be represented as successful current-head validation
