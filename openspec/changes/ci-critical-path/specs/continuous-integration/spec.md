## MODIFIED Requirements

### Requirement: The native terminal host is validated in CI rather than on workstations
Development validation SHALL own `native/terminal-host/**`, its run scripts, Node-addon harness, protocol fixtures and fuzz corpus, and provenance check through one deterministic pull-request-cadence validation owner. When impact classification selects that owner, CI SHALL schedule exactly Windows x64, Linux x64, and macOS arm64 targets with pinned Rust and Zig toolchains. Every target SHALL build the terminal-host binary and Node-API 9 lock artifact, run unit tests, platform-primitive tests, addon lifecycle/alias tests, fixture roles, and non-interactive probes, and upload the debug artifacts under platform-neutral names. The fixture-role integration test binary MAY execute as a fixed number of deterministic partition jobs per target, each on its own runner, provided every test belongs to exactly one partition, each partition records its identity in its outcome, and the protected development check requires every partition of every selected target. Each native dependency included in an uploaded artifact SHALL be compiled for the exact declared operating-system and architecture target with a baseline CPU model rather than the producing runner's native CPU features; an unsupported Cargo-to-native target mapping SHALL fail before compilation. The Linux x64 target SHALL additionally build and run the decoder fuzz target for a pinned bounded duration against its checked-in corpus. Every selected target SHALL participate in the protected development check. Changes touching none of the owned paths SHALL NOT schedule the owner. Until milestone 6 adds complete packaged lanes, terminal-host scope SHALL remain excluded from `full-release`, so nightly Full regression and release gates SHALL NOT infer terminal-host coverage.

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
- **AND** the union of the partitions SHALL execute every test exactly once per target
- **AND** a missing, skipped, failed, or stale partition SHALL fail the protected development check

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

### Requirement: Publication Windows full validation is sharded and reconstructed

Nightly and stable-candidate publication validation SHALL execute each supported Windows runtime's canonical `full-release` plan through the reviewed `core`, `resource`, `rendering`, `package`, and `predecessor` hosted-runner shards. Every canonical command and test invocation SHALL belong to exactly one shard. Each shard SHALL bind the one exact package artifact selected by the publication plan to the exact source, version, runtime, run, attempt, canonical-plan digest, assigned work, and local verified build prerequisite.

Only the package shard SHALL enable Defender for measured startup and execute package startup, contracts, smoke, and update-timing owners. Only the predecessor shard SHALL execute the published-predecessor owner. Each of those two shards SHALL prepare its own exact package installation for its own consumers and SHALL NOT share installed state with any other shard. A Windows publication lane SHALL be successful only after all five current-run shard results reconstruct one complete `a1-validation-outcomes-v1` result in canonical order. Missing, duplicate, stale, malformed, failed, cancelled, wrong-plan, cross-runtime, or incomplete shard evidence SHALL prevent both the lane and publication validation aggregate from succeeding. No shard result alone SHALL authorize candidate success or publication.

Linux and macOS publication full validation MAY remain sequential. Bounded development publication SHALL retain its reviewed non-full lane plan rather than scheduling Windows shards. Final stable publication SHALL continue adopting the exact successful candidate-validation package pair without rebuilding or rerunning candidate validation. Post-publication smoke SHALL retain the complete platform/runtime matrix independently of the validation execution shape.

#### Scenario: Stable candidate validates Windows
- **WHEN** candidate validation selects `full-release` for Windows Node 22 and Node 24
- **THEN** each runtime SHALL schedule `core`, `resource`, `rendering`, `package`, and `predecessor` shards from one canonical plan
- **AND** the candidate result SHALL require both reconstructed Windows lanes alongside the unchanged Linux and macOS results

#### Scenario: A publication shard is incomplete
- **WHEN** one expected Windows shard is missing, duplicated, stale, malformed, unsuccessful, belongs to another runtime or plan, or omits assigned work
- **THEN** no successful complete lane SHALL be produced for that runtime
- **AND** the publication validation aggregate SHALL fail with available shard and owner evidence

#### Scenario: Development preview validation runs
- **WHEN** development mode selects package smoke and installation rather than `full-release`
- **THEN** it SHALL retain the reviewed sequential Node 24 platform lanes without scheduling the Windows shard plan
- **AND** complete Windows Node 22/24 coverage SHALL remain in nightly, candidate, and Full regression cadence

#### Scenario: Stable publication adopts its candidate
- **WHEN** an authorized stable publication uses a successful exact-source, exact-version candidate run
- **THEN** stable publication SHALL retain its intentional validation skip and adopt the candidate-validated package pair
- **AND** the candidate run's reconstructed Windows lanes SHALL remain mandatory evidence rather than being replaced by a shard or a new stable build

#### Scenario: Published packages are smoked
- **WHEN** publication proceeds after validation or candidate adoption
- **THEN** post-publication smoke SHALL retain every platform/runtime lane selected before Windows validation was sharded
- **AND** a sequential-validation matrix that excludes Windows SHALL NOT narrow that smoke coverage

## ADDED Requirements

### Requirement: Pull-request chaos runs use a shorter bounded budget
The resident chaos validation owner SHALL run with a 300-second action budget on pull-request validation lanes and with its 600-second default budget on nightly publication, Full regression, and manual dispatch. The budget SHALL be recorded in the chaos report beside the seed and action schedule. The shorter budget SHALL NOT change the action set, invariants, replay contract, failure semantics, or the release build the run exercises.

#### Scenario: A pull request selects resident chaos
- **WHEN** impact classification selects the resident-chaos owner for a pull request
- **THEN** each platform's chaos lane SHALL run a 300-second budget and record that budget in its report

#### Scenario: Exhaustive cadence runs resident chaos
- **WHEN** nightly publication, Full regression, or a manual dispatch runs the resident-chaos owner
- **THEN** the run SHALL use the 600-second budget and record it in its report

### Requirement: Native toolchains and caches are pinned and stable
The Rust toolchain used by every validation and publication job SHALL be pinned by a repository `rust-toolchain.toml`, and the Linux fuzz toolchain and `cargo-fuzz` version SHALL be pinned and cached, so a new upstream release changes no job until the pin changes. The Zig cache SHALL use one stable key per workflow and platform with a declared size limit, so successive runs restore and replace the same cache rather than adding one cache per run. A warm cache for the terminal host test profile SHALL be saved from the default branch so pull requests can restore it. A cache miss SHALL change only duration, never the build inputs or outputs.

#### Scenario: Upstream stable Rust releases
- **WHEN** a newer stable Rust is published and the repository pin is unchanged
- **THEN** every job SHALL continue to install the pinned version and SHALL restore its existing caches

#### Scenario: Zig caches accumulate
- **WHEN** many runs complete on one platform
- **THEN** that platform SHALL hold one Zig cache per workflow, bounded by the declared size limit

### Requirement: macOS x64 release artifacts are cross-compiled
The publication build for the macOS x64 release terminal host and process guardian SHALL run on the macOS arm64 runner by compiling for the `x86_64-apple-darwin` target, placing the artifacts under the `darwin-x64` platform directory with a manifest, notices, and Zig target derived from the requested target rather than the host. The built executable's identity SHALL be verified on the producing runner under Rosetta 2, or by its Mach-O architecture when Rosetta is unavailable. Packing SHALL continue to require every supported platform's artifact and manifest, and post-publication smoke SHALL retain its macOS x64 lane as the native end-to-end check of the shipped bytes.

#### Scenario: Publication builds native artifacts
- **WHEN** a nightly, candidate, or development publication builds its terminal hosts and guardians
- **THEN** the macOS arm64 job SHALL produce both the `darwin-arm64` and `darwin-x64` artifacts, each with a manifest naming its own target
- **AND** no Intel macOS build job SHALL be scheduled

#### Scenario: Cross-compiled identity cannot be executed
- **WHEN** the producing runner cannot execute the `x86_64` artifact
- **THEN** the build SHALL verify the artifact's Mach-O architecture and SHALL NOT report a native identity it did not observe
