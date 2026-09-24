## ADDED Requirements

### Requirement: The native terminal host is validated in CI rather than on workstations
Development validation SHALL own `native/terminal-host/**`, its run scripts and its provenance check through a deterministic pull-request-cadence validation owner. When the impact classifier selects that owner, CI SHALL build the crate on Windows x64 with pinned Rust and Zig toolchains, run its unit tests and non-interactive probes, and upload the built debug executable as a short-lived artifact. The owner's result SHALL participate in the protected development check. Changes that touch none of the owned paths SHALL NOT run the job.

The crate's build script SHALL refuse to build on a Windows host outside CI unless the explicit `A1_LOCAL_TERMINAL_HOST_BUILD=1` override is set. It SHALL fail before invoking Zig or fetching Zig packages, with a concise message naming the CI job and the override.

#### Scenario: A pull request changes the terminal host
- **WHEN** a pull request changes a file under `native/terminal-host/`
- **THEN** impact classification SHALL select the terminal-host owner
- **AND** CI SHALL build, unit-test and probe the crate on Windows x64
- **AND** the built executable SHALL be available as a workflow artifact
- **AND** a build, test or probe failure SHALL fail the protected development check

#### Scenario: A pull request does not touch the terminal host
- **WHEN** a pull request changes no terminal-host-owned path
- **THEN** the terminal-host job SHALL be reported as not selected and SHALL NOT build the crate

#### Scenario: A developer builds the crate locally on Windows
- **WHEN** `cargo test`, `cargo build` or `npm run test:terminal-host` runs on a Windows host without `CI` and without `A1_LOCAL_TERMINAL_HOST_BUILD=1`
- **THEN** the build SHALL fail before invoking Zig
- **AND** the message SHALL name the CI job and the override
- **AND** no Zig package-cache entries SHALL be created by that attempt

#### Scenario: A developer explicitly overrides the guard
- **WHEN** the same build runs with `A1_LOCAL_TERMINAL_HOST_BUILD=1`
- **THEN** the build SHALL proceed as it does in CI
