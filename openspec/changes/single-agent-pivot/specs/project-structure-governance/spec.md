## ADDED Requirements

### Requirement: Transparent and single-agent scope remain explicit
The transparent baseline SHALL support one direct full-viewport foreground terminal session and SHALL NOT claim A1-managed arbitrary-CLI tabs, resident terminal surfaces, input routing among internal panes, or visual reconnection. Bare `a1` SHALL remain one directly attached single-agent owned UI per terminal. Multi-agent tabs, resident terminal hosts, split layouts, structured or message-based agent workers, and arbitrary interactive CLI tabs SHALL NOT be reintroduced, and SHALL NOT be reserved as an extension point, without a new approved change that defines their architecture and certification rather than modifying transparent mode or reviving raw relay experiments implicitly.

#### Scenario: Product planning requests multiple agents or CLI tabs
- **WHEN** a feature needs several agents, inactive interactive CLIs, or switchable terminal surfaces inside A1
- **THEN** planning SHALL introduce a separate approved change for that architecture rather than modifying transparent mode, the single-agent launch, or reactivating raw relay experiments implicitly

#### Scenario: Single-agent planning continues
- **WHEN** an owned UI milestone is planned or implemented
- **THEN** it SHALL target the single directly attached bare-`a1` process and preserve `a1 pi` as the prerelease Pi comparison

## MODIFIED Requirements

### Requirement: Foundation areas remain product-agnostic
Shared lifecycle, launch-context, release, session-writer-lock, startup, and terminal-cleanup foundations SHALL not import product features or select behavior from Pi identity, extension identity, executable text, arguments, or visible terminal content. A generic `core`, `common`, `utils`, or `misc` area SHALL NOT become an unowned dumping ground.

#### Scenario: Feature requires shared logic
- **WHEN** logic is needed by multiple features
- **THEN** it SHALL move to a specifically named foundation contract only when it is product-agnostic and has more than one real owner

#### Scenario: Helper has one consumer
- **WHEN** a helper is used by only one feature and expresses that feature's policy
- **THEN** it SHALL remain private to that feature rather than being promoted to a generic shared area

### Requirement: Repository governance is executable
Architecture, documentation, and hygiene rules SHALL be enforced by deterministic checks that report stable rule identifiers and actionable path, line, and symbol violations where applicable. Checks SHALL cover feature dependency direction, forbidden deep imports, nested package/dependency state, generated artifacts in tracked source, prohibited terminal interception, stale redesign markers in current production documentation, production files with no declared ownership, and the complete first-party code-documentation policy. The code-documentation gate SHALL inspect the complete applicable tracked baseline without a grandfathered count, path allowlist, or accepted-violation snapshot and SHALL run in both fast pull-request validation and full release validation.

One optional local command, `npm run preflight`, SHALL run the fast governance gates pull-request validation runs against the committed merge-base diff of the current head, in a fixed order, stopping at the first failure, using the same scripts, arguments, and rule identifiers as validation: the core job's install build and build receipt, type check, architecture, changed-file code documentation, release documentation, changed-file naming, docs governance, strict OpenSpec validation with the workflow's pinned validator, the delivery-guidance governance test, and the core job's changed test scopes. Uncommitted paths SHALL be reported rather than selected. Preflight SHALL NOT replace validation as the authority, and SHALL NOT be required before pushing.

#### Scenario: New code violates a boundary
- **WHEN** a change introduces a forbidden dependency, unowned source location, nested lockfile, prohibited terminal mechanism, or code-documentation violation
- **THEN** the applicable repository gate SHALL fail with the offending path and stable violated-rule identifier
- **AND** it SHALL report the line and declaration symbol when that information is available

#### Scenario: Documentation policy behavior is changed
- **WHEN** an accepted or rejected documentation form or source classification is added or changed
- **THEN** focused governance tests SHALL prove the policy result with representative valid and invalid fixtures

#### Scenario: Existing violation remains when enforcement is enabled
- **WHEN** the complete applicable first-party baseline contains a code-documentation violation
- **THEN** fast and full validation SHALL fail rather than recording or incrementally grandfathering the violation

#### Scenario: Excluded source is scanned
- **WHEN** the documentation gate encounters synchronized, vendored, generated, build, or runtime source
- **THEN** it SHALL apply the repository's explicit classification and provenance rules instead of treating accidental path omission as an exemption

#### Scenario: Governance passes
- **WHEN** the complete baseline check runs
- **THEN** every production file, test, document, workflow, dependency, and applicable source comment SHALL satisfy its current owner and governance contract
- **AND** all mandatory architecture, documentation, type, unit, integration, update, package, and release checks SHALL pass

#### Scenario: Preflight reproduces a validation failure locally
- **WHEN** a change would fail a fast governance gate in pull-request validation and someone chooses to run `npm run preflight` on the committed head
- **THEN** preflight SHALL fail with the same rule identifier and path
- **AND** each preflight step SHALL invoke the script and arguments its validation job runs, differing only in the local selection and result paths

### Requirement: Oversized units are recorded in a shrinking size baseline
The architecture gate SHALL measure every TypeScript class under `src/` by method count and field count, and every TypeScript function or method under `src/` by line count, excluding vendored sources. A unit above the threshold of twenty methods, fifteen fields, or one hundred function lines SHALL be recorded in one committed baseline under `config/baselines/` with its current counts. The gate SHALL fail when a recorded count grows, when an unrecorded unit exceeds a threshold, or when a recorded unit falls under every threshold without its entry being removed, so the baseline can only shrink. The measurement SHALL be a deterministic source scan with a reproduction test and SHALL NOT depend on a compiler or build.

#### Scenario: A recorded class gains a method
- **WHEN** a change adds a method to a class the baseline records
- **THEN** the architecture gate SHALL fail naming the file, the class, and the count that grew

#### Scenario: A new class exceeds a threshold
- **WHEN** a change introduces a class with more than twenty methods or fifteen fields, or a TypeScript function longer than one hundred lines, that the baseline does not record
- **THEN** the architecture gate SHALL fail naming the unit and the threshold it crossed

#### Scenario: A recorded unit is split below threshold
- **WHEN** a change reduces a recorded unit under every threshold
- **THEN** the architecture gate SHALL fail until the entry is removed
- **AND** the baseline SHALL never regain that entry

#### Scenario: Counts shrink without reaching threshold
- **WHEN** a change reduces a recorded count but the unit remains above a threshold
- **THEN** the change SHALL lower the recorded count to the new value
- **AND** the gate SHALL pass with the lowered entry

## REMOVED Requirements

### Requirement: Transparent and composed scope remain explicit
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Transparent and single-agent scope remain explicit".
