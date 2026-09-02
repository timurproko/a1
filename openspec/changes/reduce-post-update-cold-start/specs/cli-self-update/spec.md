## ADDED Requirements

### Requirement: Update materializes a validated minimal runtime payload
The immutable payload selected by update SHALL contain every executable module, package manifest, native binary, and runtime asset required by supported A1 commands and profiles, and SHALL omit files classified as development-only only when generated payload evidence and exact-package validation prove they are not runtime inputs.

#### Scenario: Development-only package content is present
- **WHEN** installed dependencies contain declarations, source maps, source trees, examples, tests, or documentation that no supported runtime path reads
- **THEN** immutable materialization SHALL exclude those files from executable release and dependency-layer payloads

#### Scenario: Runtime loads a non-code asset
- **WHEN** a supported command loads a theme, template, provider catalog, native module, WebAssembly module, license-required resource, or other declared asset
- **THEN** generated payload evidence SHALL include that file and exact-package validation SHALL fail if it is absent or changed

#### Scenario: Runtime payload classification is uncertain
- **WHEN** A1 cannot prove that an installed file is development-only
- **THEN** materialization SHALL retain it rather than risk a delayed runtime failure

### Requirement: Update reuses unchanged certified runtime content
When an installed target selects runtime dependency content identical to an existing certified layer, update SHALL reuse that layer without writing another complete copy. Update evidence SHALL distinguish source discovery, reused files and bytes, newly written files and bytes, and verification reads.

#### Scenario: Preview changes only product code
- **WHEN** consecutive exact previews select the same dependency-layer identity
- **THEN** update SHALL write only release-specific product content and metadata and SHALL leave the shared layer path unchanged

#### Scenario: Existing layer trust is incomplete
- **WHEN** matching layer files exist without valid certification bound to their complete runtime identity
- **THEN** A1 SHALL verify or rematerialize them before reuse

### Requirement: Post-activation warmup is bounded and side-effect free
Where required to satisfy first-launch performance, update SHALL warm the common immutable startup graph before reporting success. Warmup SHALL be represented as update progress, SHALL finish within a declared bound, and SHALL NOT attach a terminal, create or mutate a session, prompt for project trust, execute an extension, load project-local executable resources, mutate profile settings, or perform network access.

#### Scenario: Newly activated content is cold
- **WHEN** startup evidence requires warmup for the next launch to meet its budget
- **THEN** update SHALL complete the isolated warmup against the exact active release before reporting success

#### Scenario: Warmup detects an unusable release
- **WHEN** the exact active startup graph cannot be imported or validated without forbidden side effects
- **THEN** update SHALL fail safely with bounded diagnostics and retain or restore a verified rollback release

#### Scenario: Warmup is unnecessary
- **WHEN** measured exact-package evidence proves the next launch budget without warmup
- **THEN** update MAY omit the warmup phase
