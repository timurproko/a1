## ADDED Requirements

### Requirement: Resident chaos runs are seeded and replayable
The resident chaos run SHALL derive every random choice from one seeded generator, print the seed at start, and record the seed and the executed action schedule in its report: each action with its kind, its resolved parameters, and its timestamp. `--seed` SHALL fix the seed. `--replay` SHALL re-execute the action schedule recorded in a named report in order and SHALL report every action it could not apply as divergence rather than substituting another. Every violation SHALL name the seed and the report that recorded it. Replay reproduces the action schedule; timing MAY differ and SHALL be reported separately.

#### Scenario: A violation is replayed
- **WHEN** a chaos run reports a violation and a developer replays its report
- **THEN** the replay SHALL issue the recorded actions in the recorded order with the recorded parameters
- **AND** any recorded action the replay cannot apply SHALL be reported as divergence

#### Scenario: The generator is fixed by its seed
- **WHEN** the chaos generator is created twice with the same seed
- **THEN** it SHALL produce the same sequence of draws

### Requirement: Native host verification runs locally from a published prebuilt terminal library
The terminal-host validation job SHALL publish, per platform, the `libghostty-vt` library, headers, and a manifest recording the vendored library version, the Zig target and CPU, and the library SHA-256 that its build linked. In local development builds only, the terminal-host build SHALL accept a directory holding that artifact through `TERMINAL_HOST_PREBUILT_VT`, SHALL link it instead of running Zig when the manifest matches the vendored `VERSION` and the current Cargo target, and SHALL fail with one reason when it does not. CI and release builds SHALL NOT read the override. A development script SHALL fetch the artifact for the current platform from a named branch's latest successful validation run.

#### Scenario: A developer runs one native test locally
- **WHEN** a developer runs one terminal-host integration test with the prebuilt library present and no Zig toolchain installed
- **THEN** the test SHALL build and run without invoking Zig
- **AND** the linked library SHALL be the bytes CI linked for that platform

#### Scenario: The prebuilt library does not match
- **WHEN** the manifest's version or target differs from the vendored library or the Cargo target
- **THEN** the build SHALL fail with one line naming the mismatch and SHALL NOT fall back to the library

#### Scenario: A CI or release build ignores the override
- **WHEN** a CI or release build runs with `TERMINAL_HOST_PREBUILT_VT` set
- **THEN** the build SHALL run Zig and SHALL NOT read the override
