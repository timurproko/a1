## ADDED Requirements

### Requirement: Official npm distribution has one fresh package identity
The official npm distribution SHALL be named `@timurproko/a1`, SHALL begin its independent stable version lineage at `0.1.0`, and SHALL declare only `a1` as a public executable. Internal process entry files MAY remain in the package payload but SHALL NOT be installed as public npm executables. After `@timurproko/a1@0.1.0` is verified, the obsolete `@timurproko/addone` package SHALL be permanently unpublished rather than retained as a compatibility package.

#### Scenario: Inspect fresh package metadata
- **WHEN** the exact stable `@timurproko/a1@0.1.0` tarball is packed
- **THEN** its manifest SHALL name `@timurproko/a1` at version `0.1.0` and its npm bin map SHALL contain exactly the `a1` executable

#### Scenario: Verify the fresh stable publication
- **WHEN** `@timurproko/a1@0.1.0` has been published
- **THEN** npm `latest` SHALL resolve to that exact version and registry integrity SHALL match the accepted tarball

#### Scenario: Remove the obsolete package
- **WHEN** the fresh stable publication has been verified
- **THEN** every published version of `@timurproko/addone` SHALL be permanently unpublished and a no-cache registry lookup SHALL no longer resolve the package

### Requirement: Package identity is authoritative throughout release handling
Version discovery, self-update, installed metadata lookup, immutable release derivation, release validation, publication evidence, and registry verification SHALL use `@timurproko/a1` as the sole accepted package identity. The product SHALL NOT implement a bridge release or compatibility path for installed `@timurproko/addone` packages or their materialized release state.

#### Scenario: Materialize the new package
- **WHEN** AddOne derives or validates an immutable release from the installed package
- **THEN** it SHALL accept `@timurproko/a1` metadata and SHALL reject `@timurproko/addone` as an unexpected package identity

#### Scenario: Query release channels
- **WHEN** `a1 version`, `a1 update`, or `a1 update:next` resolves npm metadata
- **THEN** every registry query and installation target SHALL reference `@timurproko/a1`

## MODIFIED Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the stable update command resolving npm tag `latest`, and `a1 update:next` as the development-preview update command resolving npm tag `next`. Invocation SHALL authorize stopping verified AddOne-owned sessions, installing the exact resolved version, materializing and activating an immutable release, and verifying the result through one ownership-safe transaction. The command SHALL NOT require manual process IDs, state deletion, or a separate activation operation.

#### Scenario: Replace the current preview
- **WHEN** the user runs `a1 update:next` while an older verified AddOne cohort is active
- **THEN** AddOne SHALL perform the replacement transaction using the exact npm `next` version and report the old and active versions

#### Scenario: Selected channel is current
- **WHEN** the selected npm tag resolves to the exact active AddOne release version
- **THEN** AddOne SHALL report that the channel is current without reinstalling it

#### Scenario: Ownership cannot be verified
- **WHEN** AddOne cannot prove that a process belongs to the active cohort
- **THEN** the update SHALL fail safely without terminating that process or deleting control state

#### Scenario: Update is interrupted
- **WHEN** an update is interrupted after a durable transaction phase
- **THEN** the next invocation SHALL continue or roll back to one verified active cohort without manual cleanup

### Requirement: Installed and channel versions are visible without runtime startup
The installed application SHALL expose `a1 version`. It SHALL report `Installed`, `Release`, and `Next` in that order and SHALL NOT start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction.

#### Scenario: Registry versions are available
- **WHEN** the user runs `a1 version` while npm `latest` and `next` are reachable
- **THEN** AddOne SHALL display valid exact semantic versions in the order `Installed`, `Release`, and `Next`

#### Scenario: Registry is unavailable
- **WHEN** installed package metadata is readable but registry queries fail
- **THEN** AddOne SHALL preserve `Installed`, mark unavailable remote fields, emit concise diagnostics, and exit successfully

### Requirement: Bare AddOne launches one foreground command transparently
Bare `a1` SHALL launch the selected foreground profile immediately without an AddOne intro, logo, version frame, chrome, reconstructed readiness frame, or other application output before the child. The initial profile SHALL launch Native Pi through transparent direct attachment.

#### Scenario: Launch bare AddOne
- **WHEN** the user runs `a1` in a supported terminal
- **THEN** AddOne SHALL start and attach one Native Pi process and the first application content SHALL be the child's own output

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare `a1` after prior foreground generations exited
- **THEN** AddOne SHALL start a fresh generation without replaying a retained terminal surface
