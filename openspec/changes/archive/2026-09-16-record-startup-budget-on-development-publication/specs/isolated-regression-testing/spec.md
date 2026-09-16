## MODIFIED Requirements

### Requirement: Exact-package startup performance is release-gated
The accepted Windows release runner SHALL measure command invocation through first input-ready frame for exact packaged `a1` and `a1 pi` launches. Evidence SHALL include a newly addressed cold release path, the first launch after completed update handling, a launch of an approved active release after its supervisor has stopped, and a subsequent warm launch, with phase durations and immutable content identities. Each release-gating scenario SHALL execute once without automatic retry, and acceptance evidence SHALL demonstrate reliable margin on every supported Windows Node lane rather than relying on a preceding failed launch to warm the path.

The measured budgets SHALL be the interactive startup budgets declared by the A1 shell capability rather than separately restated numbers. Measurement SHALL be unconditional; enforcement SHALL depend on the declared channel. Nightly publication, stable publication, and complete regression SHALL fail on an overrun. A launch that records no input-ready frame SHALL fail in every channel.

#### Scenario: First launch follows update
- **WHEN** an exact packaged update activates a release whose product path has not previously launched on the worker
- **THEN** both supported profile scenarios SHALL be measured against the declared post-update startup budget and record phase-level evidence

#### Scenario: Restart-equivalent launch has no live supervisor
- **WHEN** exact-package validation stops the active release's supervisor while preserving its approved immutable release and durable certification
- **THEN** both supported profiles SHALL be measured against the declared no-live-supervisor startup budget, evidence SHALL identify durable validation and replacement-supervisor startup separately, and the accepted fast path SHALL perform no payload-wide file reads or hashes

#### Scenario: Restart evidence is invalid
- **WHEN** exact-package validation changes the certified release, dependency binding, managed path, or platform immutability evidence while no supervisor is live
- **THEN** launch SHALL reject the restart fast path before executing selected release content and the gate SHALL observe safe fallback or failure

#### Scenario: Warm launch is measured
- **WHEN** the active release startup graph and dependency layer have already been warmed
- **THEN** both supported profile scenarios SHALL be measured against the declared warm startup budget

#### Scenario: Startup budget regresses
- **WHEN** bootstrap, guardian, module loading, services, resources, session creation, or first render causes any budget to be exceeded
- **THEN** the gate SHALL name the dominant measured phases and record the overrun
- **AND** an enforcing channel SHALL fail before publication

#### Scenario: A launch never becomes input-ready
- **WHEN** a measured profile and launch kind records no input-ready frame
- **THEN** the gate SHALL fail in every channel regardless of its enforcement mode

#### Scenario: A retry would warm the failed path
- **WHEN** a first Node 22 or Node 24 exact-package startup attempt exceeds its budget
- **THEN** validation SHALL retain the failure and SHALL NOT rerun the scenario to obtain a warmed passing result

#### Scenario: Supported Windows Node lanes differ
- **WHEN** the same exact candidate passes a warm startup budget on one supported Windows Node version and fails it on another
- **THEN** acceptance SHALL remain blocked until phase-attributed evidence shows the slower supported lane meets the unchanged budget with reliable first-attempt margin

## ADDED Requirements

### Requirement: Development publication records startup budget evidence
The development publication channel SHALL measure both supported profiles and all three launch kinds on the first attempt exactly as an enforcing channel does. It SHALL record every overrun with its profile, launch kind, measured elapsed time, applicable budget, and dominant phases in the startup performance evidence and in the run summary, and SHALL annotate the run so the overrun is visible without downloading an artifact. It SHALL NOT block publication on an overrun, SHALL NOT reduce the number of measured scenarios, and SHALL NOT retry a measurement.

The recorded evidence SHALL name the enforcement mode under which it was produced so a recorded result is never mistaken for an enforced pass. Nightly publication, stable publication, and complete regression SHALL continue to fail on the same overrun.

#### Scenario: A development preview exceeds a budget
- **WHEN** a numbered development preview measures an exact packaged launch above its declared budget
- **THEN** validation SHALL record the violation, annotate the run, and allow publication to proceed
- **AND** the recorded evidence SHALL identify the recording enforcement mode

#### Scenario: Nightly measures the same overrun
- **WHEN** nightly publication or complete regression measures the same overrun on the same bytes
- **THEN** validation SHALL fail with the dominant measured phases and publication SHALL be blocked

#### Scenario: Enforcement mode is unspecified
- **WHEN** the exact-package startup gate runs without a declared enforcement mode or with an unrecognized one
- **THEN** it SHALL enforce the budgets and fail on an overrun
