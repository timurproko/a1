## ADDED Requirements

### Requirement: Native host verification runs locally from a published prebuilt terminal library
The terminal-host build SHALL accept, in non-release development builds only, a prebuilt `libghostty-vt` library directory named by `TERMINAL_HOST_PREBUILT_VT` whose manifest records the vendored library version, the Zig target and CPU, and the library SHA-256. The build SHALL link that library instead of running Zig when the manifest matches the vendored `VERSION` and the current Cargo target, and SHALL fail with one reason when it does not. Release artifacts SHALL NOT use the override. The terminal-host validation and release jobs SHALL publish the library, headers, and manifest they linked as a per-platform artifact, and a development script SHALL fetch it for the current platform from a named branch's latest green run.

#### Scenario: A developer runs one native test locally
- **WHEN** a developer runs one terminal-host integration test with the prebuilt library present and no Zig toolchain installed
- **THEN** the test SHALL build and run without invoking Zig
- **AND** the linked library SHALL be the bytes CI linked for that platform

#### Scenario: The prebuilt library does not match
- **WHEN** the manifest's version or target differs from the vendored library or the Cargo target
- **THEN** the build SHALL fail with one line naming the mismatch and SHALL NOT fall back to the library

#### Scenario: A release build ignores the override
- **WHEN** a release artifact is built with `TERMINAL_HOST_PREBUILT_VT` set
- **THEN** the build SHALL run Zig and SHALL NOT read the override

### Requirement: Resident chaos runs are seeded and replayable
The resident chaos run SHALL derive every random choice from one seeded generator, print the seed at start and in its report, and record each action with its parameters and timestamp in the report. `--seed` SHALL fix the seed and `--replay` SHALL rerun a recorded action schedule under its seed. Every violation SHALL name the seed that produced it. Replay reproduces the action schedule; timing MAY differ and SHALL be reported separately.

#### Scenario: A violation is replayed
- **WHEN** a chaos run reports a violation and a developer reruns it with that seed
- **THEN** the rerun SHALL execute the same action sequence with the same parameters

#### Scenario: Two runs share a seed
- **WHEN** two chaos runs use the same seed and duration
- **THEN** their recorded action sequences SHALL be identical
