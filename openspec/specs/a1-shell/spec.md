# A1 Shell Specification

## Purpose

Defines the installed A1 command surface, immutable release behavior, and shared owned interactive rendering path.
## Requirements
### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the stable update command resolving npm tag `latest`, and `a1 update:next` as the development-preview update command resolving npm tag `next`. Invocation SHALL authorize stopping verified A1-owned sessions, installing the exact resolved version, materializing and activating an immutable release, and verifying the result through one ownership-safe transaction. The command SHALL return to the invoking shell after reporting its final result and SHALL NOT require manual process IDs, state deletion, a separate activation operation, or a subsequent bare launch to finish the update.

#### Scenario: Replace the current preview
- **WHEN** the user runs `a1 update:next` while an older verified A1 cohort is active
- **THEN** A1 SHALL perform the replacement transaction using the exact npm `next` version, report the old and active versions, and return to the terminal prompt

#### Scenario: Selected channel is current
- **WHEN** the selected npm tag resolves to the exact active A1 release version
- **THEN** A1 SHALL report that the channel is current without reinstalling it

#### Scenario: Ownership cannot be verified
- **WHEN** A1 cannot prove that a process belongs to the active cohort
- **THEN** the update SHALL fail safely without terminating that process or deleting control state

#### Scenario: Update is interrupted
- **WHEN** an update is interrupted after a durable transaction phase
- **THEN** the next invocation SHALL continue or roll back to one verified active cohort without manual cleanup

#### Scenario: Launch after a completed update
- **WHEN** the user runs bare `a1` after the update command reported success
- **THEN** A1 SHALL launch the already active target without printing installation or activation messages

### Requirement: Version output follows the Pi command convention
The installed application SHALL expose `a1 --version` and SHALL NOT expose a `version` subcommand or start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction. A stable release SHALL print only its installed exact semantic version without remote discovery. A development build SHALL report `Current`, `Develop`, and `Release` in that order and SHALL discover authoritative package dist-tags as one coherent result; an absent development tag SHALL be unavailable without a diagnostic, while discovery failure SHALL make both remote fields unavailable with one concise `A1` diagnostic.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 --version` from a stable release
- **THEN** A1 SHALL print only the installed exact semantic version without querying remote channels

#### Scenario: Development build versions
- **WHEN** the user runs `a1 --version` from a development build
- **THEN** A1 SHALL display `Current`, `Develop`, and `Release` in order, applying the declared unavailable behavior when remote channel metadata is absent or unreachable

#### Scenario: Old subcommand notation
- **WHEN** the user runs `a1 version`
- **THEN** A1 SHALL reject it as an unknown command

### Requirement: Interactive launch forms use the owned Pi UI pipeline
Bare `a1` SHALL launch the A1-owned product surface directly. Explicit prerelease `a1 pi` SHALL use the same owned rendering and input pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected. Profile selection SHALL NOT introduce transparent child attachment, a PTY, a terminal parser, a byte relay, or a second rendering path. The redundant `a1 ui` route SHALL NOT be exposed.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start the owned product UI without requiring a profile argument

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare A1 after a previous owned foreground session exited
- **THEN** A1 SHALL start a fresh owned session without replaying the prior retained terminal surface

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs prerelease `a1 pi`
- **THEN** A1 SHALL use the shared owned pipeline with product surfaces withheld and Pi's ordinary profile selected

#### Scenario: Request the removed development alias
- **WHEN** the user runs `a1 ui`
- **THEN** A1 SHALL reject the unsupported profile and SHALL NOT silently select another runtime

### Requirement: Stable platform claims require certification
The owned terminal UI architecture SHALL remain application-agnostic across its native platform launchers, but a stable terminal support or parity claim for a platform SHALL require the separately deferred physical and exact-package certification for that platform.

#### Scenario: Uncertified preview is published
- **WHEN** a manually accepted candidate passes applicable non-desktop gates without complete physical certification
- **THEN** it MAY publish only as an explicitly uncertified development preview and SHALL NOT move npm `latest` or claim stable cross-platform support

### Requirement: Official npm distribution has one fresh package identity
The official npm distribution SHALL be named `@timurproko/a1`, SHALL begin its independent stable version lineage at `0.1.0`, and SHALL declare only `a1` as a public executable. Internal process entry files MAY remain in the package payload but SHALL NOT be installed as public npm executables. After `@timurproko/a1@0.1.0` is verified, every published version of the obsolete `@timurproko/addone` package SHALL be deprecated toward `@timurproko/a1`. The obsolete package SHALL NOT be retained as a compatibility package; later unpublication MAY occur as owner-controlled registry administration when npm policy permits.

#### Scenario: Inspect fresh package metadata
- **WHEN** the exact stable `@timurproko/a1@0.1.0` tarball is packed
- **THEN** its manifest SHALL name `@timurproko/a1` at version `0.1.0` and its npm bin map SHALL contain exactly the `a1` executable

#### Scenario: Verify the fresh stable publication
- **WHEN** `@timurproko/a1@0.1.0` has been published
- **THEN** npm `latest` SHALL resolve to that exact version and registry integrity SHALL match the accepted tarball

#### Scenario: Deprecate the obsolete package
- **WHEN** the fresh stable publication has been verified and npm policy rejects whole-package deletion
- **THEN** every published version of `@timurproko/addone` SHALL carry an npm deprecation directing users to `@timurproko/a1`, and current product behavior SHALL continue to reject the obsolete identity

### Requirement: Package identity is authoritative throughout release handling
Version discovery, self-update, installed metadata lookup, immutable release derivation, release validation, publication evidence, and registry verification SHALL use `@timurproko/a1` as the sole accepted package identity. The product SHALL NOT implement a bridge release or compatibility path for installed `@timurproko/addone` packages or their materialized release state.

#### Scenario: Materialize the new package
- **WHEN** A1 derives or validates an immutable release from the installed package
- **THEN** it SHALL accept `@timurproko/a1` metadata and SHALL reject `@timurproko/addone` as an unexpected package identity

#### Scenario: Query release channels
- **WHEN** `a1 --version`, `a1 update`, or `a1 update:next` resolves npm metadata
- **THEN** every registry query and installation target SHALL reference `@timurproko/a1`

