## MODIFIED Requirements

### Requirement: The complete suite remains available on demand
The complete non-physical automated suite SHALL remain runnable locally (`npm run test:full`) and through manual workflow dispatch, so a maintainer can widen validation when a change feels risky, and SHALL run on a nightly schedule against the current `develop` tip so exhaustive owners and enforced budgets are exercised every day independent of publication. Routine development SHALL NOT require it.

A scope that the complete-regression lanes cannot run MAY be excluded from the `full-release` plan only through an explicit `fullReleaseExclusion` reason on its definition in `config/validation-suites.json`. The only permitted exclusion is the Windows-only `terminal-host` scope, whose pull-request owner validates every change to its paths. Adding another exclusion SHALL require a reviewed change to this requirement.

#### Scenario: Maintainer requests full validation
- **WHEN** the maintainer dispatches the full-regression workflow or runs the full tier locally
- **THEN** every non-physical scope without a declared `fullReleaseExclusion` SHALL execute and report per-scope timing and outcomes

#### Scenario: Nightly schedule fires
- **WHEN** the scheduled Full regression runs
- **THEN** it SHALL validate the current `develop` tip with every pull-request and exhaustive owner whose scopes are not declared `fullReleaseExclusion`, and with enforced startup budgets
- **AND** its failure SHALL be visible as a workflow failure without changing publication authority

#### Scenario: A scope is excluded from complete regression
- **WHEN** a scope definition declares `fullReleaseExclusion`
- **THEN** it SHALL carry a non-empty reason, SHALL NOT be included by `full-release`, and SHALL be `terminal-host`

## ADDED Requirements

### Requirement: The native terminal host is validated in CI rather than on workstations
Development validation SHALL own `native/terminal-host/**`, its run scripts and its provenance check through a deterministic pull-request-cadence validation owner. When the impact classifier selects that owner, CI SHALL build the crate on Windows x64 with pinned Rust and Zig toolchains, run its unit tests and non-interactive probes, and upload the built debug executable as a short-lived artifact. The owner's result SHALL participate in the protected development check. Changes that touch none of the owned paths SHALL NOT run the job. Until the crate builds on every complete-regression lane, its scope SHALL be excluded from `full-release`, so nightly Full regression and release gates SHALL NOT build it.

The crate's build script SHALL refuse to build on a Windows host outside CI unless the explicit `TERMINAL_HOST_LOCAL_BUILD=1` override is set. It SHALL fail before invoking Zig or fetching Zig packages, with a concise message naming the CI job and the override.

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
- **WHEN** `cargo test`, `cargo build` or `npm run test:terminal-host` runs on a Windows host without `CI` and without `TERMINAL_HOST_LOCAL_BUILD=1`
- **THEN** the build SHALL fail before invoking Zig
- **AND** the message SHALL name the CI job and the override
- **AND** no Zig package-cache entries SHALL be created by that attempt

#### Scenario: A developer explicitly overrides the guard
- **WHEN** the same build runs with `TERMINAL_HOST_LOCAL_BUILD=1`
- **THEN** the build SHALL proceed as it does in CI
