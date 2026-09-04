## ADDED Requirements

### Requirement: Exact-package startup performance is release-gated
The accepted Windows release runner SHALL measure command invocation through first input-ready frame for exact packaged `a1` and `a1 pi` launches. Evidence SHALL include a newly addressed cold release path, the first launch after completed update handling, a launch of an approved active release after its supervisor has stopped, and a subsequent warm launch, with phase durations and immutable content identities.

#### Scenario: First launch follows update
- **WHEN** an exact packaged update activates a release whose product path has not previously launched on the worker
- **THEN** both supported profile scenarios SHALL satisfy the 5-second post-update startup budget and record phase-level evidence

#### Scenario: Restart-equivalent launch has no live supervisor
- **WHEN** exact-package validation stops the active release's supervisor while preserving its approved immutable release and durable certification
- **THEN** both supported profiles SHALL satisfy the 5-second startup budget, evidence SHALL identify durable validation and replacement-supervisor startup separately, and the accepted fast path SHALL perform no payload-wide file reads or hashes

#### Scenario: Restart evidence is invalid
- **WHEN** exact-package validation changes the certified release, dependency binding, managed path, or platform immutability evidence while no supervisor is live
- **THEN** launch SHALL reject the restart fast path before executing selected release content and the gate SHALL observe safe fallback or failure

#### Scenario: Warm launch is measured
- **WHEN** the active release startup graph and dependency layer have already been warmed
- **THEN** both supported profile scenarios SHALL satisfy the 3-second warm startup budget

#### Scenario: Startup budget regresses
- **WHEN** bootstrap, guardian, module loading, services, resources, session creation, or first render causes either budget to be exceeded
- **THEN** release gating SHALL fail and name the dominant measured phases

### Requirement: Optimized runtime payload and layers are exact-package validated
Release gates SHALL prove minimal-payload completeness, unchanged-layer reuse, changed-layer isolation, persistent compile-cache invalidation, side-effect-free warmup, full-copy rollback compatibility, extension loading, native assets, and terminal module identity against exact packed bytes.

#### Scenario: Required runtime file is omitted
- **WHEN** any supported command, profile, provider path, extension boundary, export workflow, theme, native adapter, or runtime asset requires a file absent from the generated payload
- **THEN** exact-package validation SHALL fail before publication

#### Scenario: Dependency layer is tampered
- **WHEN** a selected layer file, manifest, binding, or managed path differs from its certified identity
- **THEN** activation and launch SHALL fail closed without selecting mixed content or damaging a valid rollback release

#### Scenario: Consecutive previews share dependencies
- **WHEN** a representative exact update changes product files while retaining the dependency set
- **THEN** evidence SHALL show one certified dependency layer path is reused and no duplicate full dependency tree is written

#### Scenario: Compile cache is stale or unavailable
- **WHEN** the Node version or immutable content identity changes, or cache storage cannot be used
- **THEN** A1 SHALL reject stale entries or fall back safely without changing runtime behavior
