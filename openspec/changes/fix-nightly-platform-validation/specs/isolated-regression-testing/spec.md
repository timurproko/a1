## ADDED Requirements

### Requirement: Shortcut help regression evidence respects platform presentation
Shortcut-help regression checks SHALL distinguish the configured binding identity from its platform-specific visible label. Checks SHALL retain live override, unbound-command fallback, and pinned-profile coverage rather than accepting arbitrary labels or changing runtime presentation to satisfy a host-specific expectation.

#### Scenario: A live model-selection override uses Alt
- **WHEN** the effective model-selection binding is changed to `alt+m` after the startup header is created
- **THEN** the regression check SHALL require the refreshed header to display `option+m` on macOS and `alt+m` on Windows and Linux
- **AND** the logical binding SHALL remain `alt+m`

#### Scenario: Model selection is unbound
- **WHEN** the owned profile has no effective model-selection shortcut
- **THEN** the regression check SHALL require the `/model` fallback rather than an invented keybinding

### Requirement: Repeated event-frame diagnostics are deterministic and actionable
Repeated scripted terminal-frame diagnostics SHALL capture identical structured state and normalized frame bytes for the same declared workload, independent of opposing ambient color capabilities and host scheduling variation. Workloads SHALL explicitly control their relevant capture inputs and boundaries and restore test-owned global state and scheduled work on success or failure. Normalization SHALL remain limited to the already declared portability envelopes; semantic ANSI, reset boundaries, row payloads, geometry, cursor addressing, clearing order, and event stages SHALL remain strict. A diagnostic fixture SHALL NOT replace independent pinned-versus-owned parity authority.

#### Scenario: Equivalent captures are repeated
- **WHEN** the same declared truecolor workload is captured repeatedly under truecolor and 256-color ambient capabilities
- **THEN** every capture SHALL produce the same diagnostic hash and preserve all declared stages
- **AND** scheduling delays between captures SHALL NOT change workload evidence

#### Scenario: Captures diverge
- **WHEN** repeated equivalent captures produce different structured results
- **THEN** validation SHALL fail and report the repetition, ambient mode, first differing state or frame stage, and a bounded escaped difference sufficient to locate the mismatch
- **AND** it SHALL NOT accept multiple hashes, retry until one passes, strip semantic ANSI, or regenerate a baseline to conceal unexplained divergence

#### Scenario: Capture fails or is disposed
- **WHEN** a capture succeeds or throws
- **THEN** its capability, theme, clock, or scheduler overrides SHALL be restored as applicable and its owned timers and resources SHALL be disposed before the next workload
