## ADDED Requirements

### Requirement: Native assembly uses explicit complete and core build contracts

The repository SHALL expose `npm run build` as the complete current-platform developer build and SHALL give npm installation plus CI lanes that assemble native artifacts separately an explicitly named core-build entry. The core entry SHALL compile the managed runtime and process guardian needed by those callers without building the terminal host. Selected native validation and publication lanes SHALL continue to build and certify terminal-host artifacts through their existing platform-owned steps, exactly once per intended candidate.

#### Scenario: Developer invokes the normal build

- **WHEN** a developer invokes `npm run build`
- **THEN** the build SHALL run the core compilation followed by current-platform terminal-host assembly and final payload recording

#### Scenario: npm installs repository dependencies

- **WHEN** npm runs the repository's `prepare` lifecycle during dependency installation
- **THEN** the lifecycle SHALL run the explicit core build without fetching or compiling the terminal host
- **AND** later selected native lanes SHALL retain ownership of terminal-host assembly and certification

#### Scenario: Native CI packs a candidate

- **WHEN** a selected validation or publication lane builds a terminal host after its core installation build
- **THEN** it SHALL retain its pinned Rust and Zig inputs, release-profile identity checks, and manifest verification
- **AND** the complete developer-build contract SHALL NOT cause an extra implicit terminal-host build in that lane
