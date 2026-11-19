## Purpose

Defines the installed AddOne command surface, immutable release behavior, and selected transparent single-foreground terminal handoff.

## ADDED Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `addone update`/`a1 update` as equivalent stable update commands resolving npm tag `latest`, and `addone update:next`/`a1 update:next` as equivalent development-preview update commands resolving npm tag `next`. Invocation SHALL authorize stopping verified AddOne-owned sessions, installing the exact resolved version, materializing and activating an immutable release, and verifying the result through one ownership-safe transaction. The command SHALL NOT require manual process IDs, state deletion, or a separate activation operation.

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
The installed application SHALL expose equivalent `addone version` and `a1 version` commands. Each SHALL report `Installed`, `Release`, and `Next` in that order and SHALL NOT start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction.

#### Scenario: Registry versions are available
- **WHEN** the user runs `a1 version` while npm `latest` and `next` are reachable
- **THEN** AddOne SHALL display valid exact semantic versions in the order `Installed`, `Release`, and `Next`

#### Scenario: Registry is unavailable
- **WHEN** installed package metadata is readable but registry queries fail
- **THEN** AddOne SHALL preserve `Installed`, mark unavailable remote fields, emit concise diagnostics, and exit successfully

### Requirement: Bare AddOne launches one foreground command transparently
Bare `addone` and `a1` SHALL launch the selected foreground profile immediately without an AddOne intro, logo, version frame, chrome, reconstructed readiness frame, or other application output before the child. The initial profile SHALL launch Native Pi through transparent direct attachment.

#### Scenario: Launch bare AddOne
- **WHEN** the user runs `a1` in a supported terminal
- **THEN** AddOne SHALL start and attach one Native Pi process and the first application content SHALL be the child's own output

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare AddOne after prior foreground generations exited
- **THEN** AddOne SHALL start a fresh generation without replaying a retained terminal surface

### Requirement: Transparent handoff uses the complete physical viewport
The selected transparent capability SHALL attach one child across the complete physical terminal viewport with no AddOne-reserved rows, terminal parser, input relay, output reconstruction, inferred readiness frame, or display write after handoff.

#### Scenario: Physical terminal resizes
- **WHEN** the physical terminal changes size during the transparent session
- **THEN** the child SHALL observe native terminal dimensions without AddOne chrome offsets

#### Scenario: Foreground child exits
- **WHEN** the transparent child exits
- **THEN** AddOne SHALL preserve child-produced output and spacing, perform bounded ownership cleanup, emit no reconstructed final frame, and return the child outcome

### Requirement: Transparent terminal ownership remains native
During transparent handoff, the child and physical terminal SHALL own rendering, input encoding, selection, clipboard, scrollback, and terminal modes. AddOne SHALL retain only foreground lease, process identity, lifecycle reporting, and bounded abnormal-exit cleanup.

#### Scenario: User interacts after handoff
- **WHEN** the user sends key, text, paste, focus, mouse, wheel, selection, clipboard, or resize actions
- **THEN** the native terminal path SHALL handle them without an AddOne input command or application-specific translation

#### Scenario: Foreground ownership is lost
- **WHEN** the broker or child fails during transparent attachment
- **THEN** AddOne SHALL apply bounded owned-process cleanup, report that visual reconnection is unavailable, and leave the parent terminal usable

### Requirement: Stable platform claims require certification
The transparent architecture SHALL remain application-agnostic across its native platform launchers, but a stable terminal support or parity claim for a platform SHALL require the separately deferred physical and exact-package certification for that platform.

#### Scenario: Uncertified preview is published
- **WHEN** a manually accepted candidate passes applicable non-desktop gates without complete physical certification
- **THEN** it MAY publish only as an explicitly uncertified development preview and SHALL NOT move npm `latest` or claim stable cross-platform support
