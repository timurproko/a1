# A1 Shell Specification

## Purpose

Defines the installed A1 command surface, immutable release behavior, and selected transparent single-foreground terminal handoff.
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

### Requirement: Installed and channel versions are visible without runtime startup
The installed application SHALL expose `a1 version`. It SHALL report `Installed`, `Release`, and `Next` in that order and SHALL NOT start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction. Remote channel discovery SHALL read the authoritative package dist-tags as one coherent registry result.

#### Scenario: Registry versions are available
- **WHEN** the user runs `a1 version` while npm `latest` and `next` are defined and reachable
- **THEN** A1 SHALL display valid exact semantic versions in the order `Installed`, `Release`, and `Next`

#### Scenario: Next channel is not defined
- **WHEN** npm metadata is reachable, `latest` is defined, and the package has no `next` dist-tag
- **THEN** A1 SHALL display the latest version under `Release`, display `Next: unavailable`, emit no error diagnostic for the absent optional channel, and exit successfully

#### Scenario: Registry is unavailable
- **WHEN** installed package metadata is readable but the package dist-tags query fails
- **THEN** A1 SHALL preserve `Installed`, mark both remote fields unavailable, emit one concise `A1` diagnostic describing the registry failure, and exit successfully

### Requirement: Bare A1 launches the owned Pi UI
Bare `a1` SHALL launch the A1-owned Pi UI directly. The owned UI SHALL be the ordinary development and product path rather than an opt-in profile. Explicit `a1 pi` SHALL continue to launch untouched upstream Pi through transparent direct attachment, and `a1 sandbox` SHALL retain its existing behavior. The redundant `a1 ui` route SHALL NOT be exposed.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start and attach the owned Pi UI without requiring a profile argument

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare A1 after a previous owned foreground session exited
- **THEN** A1 SHALL start a fresh owned session without replaying the prior retained terminal surface

#### Scenario: Launch the upstream fallback
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL start untouched upstream Pi through transparent direct attachment without routing through the owned UI

#### Scenario: Request the removed development alias
- **WHEN** the user runs `a1 ui`
- **THEN** A1 SHALL reject the unsupported profile and SHALL NOT silently select another runtime

### Requirement: Transparent handoff uses the complete physical viewport
The selected transparent capability SHALL attach one child across the complete physical terminal viewport with no A1-reserved rows, terminal parser, input relay, output reconstruction, inferred readiness frame, or display write after handoff.

#### Scenario: Physical terminal resizes
- **WHEN** the physical terminal changes size during the transparent session
- **THEN** the child SHALL observe native terminal dimensions without A1 chrome offsets

#### Scenario: Foreground child exits
- **WHEN** the transparent child exits
- **THEN** A1 SHALL preserve child-produced output and spacing, perform bounded ownership cleanup, emit no reconstructed final frame, and return the child outcome

### Requirement: Transparent terminal ownership remains native
During transparent handoff, the child and physical terminal SHALL own rendering, input encoding, selection, clipboard, scrollback, and terminal modes. A1 SHALL retain only foreground lease, process identity, lifecycle reporting, and bounded abnormal-exit cleanup.

#### Scenario: User interacts after handoff
- **WHEN** the user sends key, text, paste, focus, mouse, wheel, selection, clipboard, or resize actions
- **THEN** the native terminal path SHALL handle them without an A1 input command or application-specific translation

#### Scenario: Foreground ownership is lost
- **WHEN** the broker or child fails during transparent attachment
- **THEN** A1 SHALL apply bounded owned-process cleanup, report that visual reconnection is unavailable, and leave the parent terminal usable

### Requirement: Stable platform claims require certification
The transparent architecture SHALL remain application-agnostic across its native platform launchers, but a stable terminal support or parity claim for a platform SHALL require the separately deferred physical and exact-package certification for that platform.

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
- **WHEN** `a1 version`, `a1 update`, or `a1 update:next` resolves npm metadata
- **THEN** every registry query and installation target SHALL reference `@timurproko/a1`

