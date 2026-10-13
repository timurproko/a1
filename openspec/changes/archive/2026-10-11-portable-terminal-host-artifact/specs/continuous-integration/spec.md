## MODIFIED Requirements

### Requirement: The native terminal host is validated in CI rather than on workstations
Development validation SHALL own `native/terminal-host/**`, its run scripts, Node-addon harness, protocol fixtures and fuzz corpus, and provenance check through one deterministic pull-request-cadence validation owner. When impact classification selects that owner, CI SHALL schedule exactly Windows x64, Linux x64, and macOS arm64 targets with pinned Rust and Zig toolchains. Every target SHALL build the terminal-host binary and Node-API 9 lock artifact, run unit tests, platform-primitive tests, addon lifecycle/alias tests, fixture roles, and non-interactive probes, and upload the debug artifacts under platform-neutral names. Each native dependency included in an uploaded artifact SHALL be compiled for the exact declared operating-system and architecture target with a baseline CPU model rather than the producing runner's native CPU features; an unsupported Cargo-to-native target mapping SHALL fail before compilation. The Linux x64 target SHALL additionally build and run the decoder fuzz target for a pinned bounded duration against its checked-in corpus. Every selected target SHALL participate in the protected development check. Changes touching none of the owned paths SHALL NOT schedule the owner. Until milestone 6 adds complete packaged lanes, terminal-host scope SHALL remain excluded from `full-release`, so nightly Full regression and release gates SHALL NOT infer terminal-host coverage.

The crate's build script SHALL refuse to build on a Windows host outside CI unless the explicit `TERMINAL_HOST_LOCAL_BUILD=1` override is set. It SHALL fail before invoking Zig or fetching Zig packages, with a concise message naming the CI job and the override. The same guard SHALL cover binary and addon builds.

#### Scenario: A pull request changes the terminal host
- **WHEN** a pull request changes a terminal-host-owned source, script, fixture, corpus, or provenance path
- **THEN** impact classification SHALL select the terminal-host owner
- **AND** CI SHALL build, test, and probe the binary and addon on Windows x64, Linux x64, and macOS arm64
- **AND** Linux x64 SHALL run the bounded decoder fuzz target
- **AND** each platform's debug artifacts SHALL be available under unambiguous platform-neutral artifact names
- **AND** a missing, skipped, failed, or stale selected target SHALL fail the protected development check

#### Scenario: Downloaded artifact runs on another supported CPU
- **WHEN** a terminal-host artifact is downloaded from its producing runner to another machine satisfying the artifact's declared operating-system and architecture baseline
- **THEN** startup SHALL NOT depend on additional producer-specific CPU instructions
- **AND** the build contract SHALL identify the exact native target and baseline CPU policy used for that artifact

#### Scenario: A pull request does not touch the terminal host
- **WHEN** a pull request changes no terminal-host-owned path
- **THEN** the terminal-host owner SHALL be reported as not selected and SHALL schedule no terminal-host platform target

#### Scenario: Cross-user endpoint fixture cannot run
- **WHEN** a selected target cannot provision the second local identity required by the owner-only endpoint test
- **THEN** that target SHALL fail rather than skip the ownership assertion

#### Scenario: A developer builds the crate locally on Windows
- **WHEN** `cargo test`, `cargo build`, an addon build, or `npm run test:terminal-host` runs on a Windows host without `CI` and without `TERMINAL_HOST_LOCAL_BUILD=1`
- **THEN** the build SHALL fail before invoking Zig
- **AND** the message SHALL name the CI job and the override
- **AND** no Zig package-cache entries SHALL be created by that attempt

#### Scenario: A developer explicitly overrides the guard
- **WHEN** the same build runs with `TERMINAL_HOST_LOCAL_BUILD=1`
- **THEN** the build SHALL proceed as it does in CI without weakening selected CI requirements
