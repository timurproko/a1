## MODIFIED Requirements

### Requirement: The native terminal host is validated in CI rather than on workstations
Development validation SHALL own `native/terminal-host/**`, its run scripts, Node-addon harness, protocol fixtures and fuzz corpus, and provenance check through one deterministic pull-request-cadence validation owner. When impact classification selects that owner, CI SHALL schedule exactly Windows x64, Linux x64, and macOS arm64 targets with pinned Rust and Zig toolchains. Every target SHALL build the terminal-host binary and Node-API 9 lock artifact, run unit tests, platform-primitive tests, addon lifecycle/alias tests, fixture roles, and non-interactive probes, and upload the debug artifacts under platform-neutral names. The fixture-role integration test binary MAY execute as a fixed number of deterministic partition jobs per target, each on its own runner, provided every test belongs to exactly one partition, each partition records its identity in its outcome, and the protected development check requires every partition of every selected target. A partition job SHALL run only its assigned role-fixture slice and the fixture-process cleanup check; the unit, binary, and release-isolation tests SHALL run once per target in the build-and-probe lane rather than in every partition. Each native dependency included in an uploaded artifact SHALL be compiled for the exact declared operating-system and architecture target with a baseline CPU model rather than the producing runner's native CPU features; an unsupported Cargo-to-native target mapping SHALL fail before compilation. The Linux x64 target SHALL additionally build and run the decoder fuzz target for a pinned bounded duration against its checked-in corpus; it MAY restore the pinned fuzz tool binary from a cache keyed by the tool version and the pinned nightly toolchain instead of compiling it, without changing the fuzz targets, corpus, or budget. Every selected target SHALL participate in the protected development check. Changes touching none of the owned paths SHALL NOT schedule the owner. Until milestone 6 adds complete packaged lanes, terminal-host scope SHALL remain excluded from `full-release`, so nightly Full regression and release gates SHALL NOT infer terminal-host coverage.

The crate's build script SHALL refuse to build on a Windows host outside CI unless the explicit `TERMINAL_HOST_LOCAL_BUILD=1` override is set. It SHALL fail before invoking Zig or fetching Zig packages, with a concise message naming the CI job and the override. The same guard SHALL cover binary and addon builds.

#### Scenario: A pull request changes the terminal host
- **WHEN** a pull request changes a terminal-host-owned source, script, fixture, corpus, or provenance path
- **THEN** impact classification SHALL select the terminal-host owner
- **AND** CI SHALL build, test, and probe the binary and addon on Windows x64, Linux x64, and macOS arm64
- **AND** Linux x64 SHALL run the bounded decoder fuzz target
- **AND** each platform's debug artifacts SHALL be available under unambiguous platform-neutral artifact names
- **AND** a missing, skipped, failed, or stale selected target SHALL fail the protected development check

#### Scenario: Fixture-role tests run as partitions
- **WHEN** the terminal-host owner is selected and its fixture-role integration tests are partitioned
- **THEN** each partition job SHALL run its fixed subset of the unchanged test binary on its own runner and record its partition identity
- **AND** no partition job SHALL run the crate's unit, binary, or release-isolation tests
- **AND** the union of the partitions and the build-and-probe lane SHALL execute every test exactly once per target
- **AND** a missing, skipped, failed, or stale partition SHALL fail the protected development check

#### Scenario: The Linux fuzz tool is restored from cache
- **WHEN** the Linux x64 build-and-probe lane finds a cached `cargo-fuzz` binary for the pinned version and nightly toolchain
- **THEN** it SHALL skip compiling the tool and SHALL run every fuzz target against its corpus with the unchanged bounded budget
- **AND** a cache miss SHALL install the pinned tool and run the same targets

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

### Requirement: Validation candidates carry the lane's release terminal host
Every pull-request validation lane whose selected scopes consume a packed candidate, and every Full regression job that packs one, SHALL carry the release terminal-host addon for its own platform in `dist/native` after installation and before recording the build receipt. A pull-request validation lane MAY restore that output from a cache whose key names the runner operating system and architecture, the platform SDK pin where one applies, the pinned Rust and Zig versions, and a content hash of the complete terminal-host source tree, its lock file, the toolchain pin, and the build script with its imported modules; a lane that restores the output SHALL verify the restored artifacts before recording the build receipt and SHALL NOT provision the release toolchain or rebuild. A lane without a matching cache entry SHALL build the addon as before and MAY save the verified output for the same key. Publication lanes SHALL build the release terminal host within their own run. On CI, validation packing SHALL fail before `npm pack` when the candidate lacks the platform's verified process-guardian addon or terminal-host addon, naming each problem.

#### Scenario: A pull request changes resident launch routing
- **WHEN** pull-request validation runs packaged suites for the change
- **THEN** the packed candidate SHALL carry the release terminal-host addon and its role entry, and packaged launches SHALL take the route a published package takes

#### Scenario: A pull request leaves the native tree unchanged
- **WHEN** a candidate-packing lane finds a cache entry for its complete terminal-host input key
- **THEN** it SHALL restore and verify the release addon, manifest, and notices without installing Rust or Zig or running the release build
- **AND** the recorded build receipt and the packed candidate SHALL be the same as if the lane had built the addon

#### Scenario: The native tree or toolchain changes
- **WHEN** any hashed input, the SDK pin, or a pinned toolchain version differs from every cached key
- **THEN** the lane SHALL build the release terminal host as before
- **AND** it MAY save the verified output under the new key for later lanes and runs

#### Scenario: A restored artifact does not verify
- **WHEN** a restored directory is missing a file or its bytes differ from its manifest record
- **THEN** the lane SHALL fail before recording the build receipt and SHALL NOT pack

#### Scenario: A lane packs without the host
- **WHEN** a CI lane reaches validation packing without this platform's terminal-host addon
- **THEN** packing SHALL fail before `npm pack` and SHALL name the missing artifact
