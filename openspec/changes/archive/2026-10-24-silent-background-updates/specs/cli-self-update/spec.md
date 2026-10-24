## MODIFIED Requirements

### Requirement: Interactive startup checks for a newer release on the running channel

When an interactive profile (`a1` or `a1 pi`) starts from a published build, A1 SHALL determine whether a newer release exists on the running version's channel: npm dist-tag `latest` for a version without a prerelease component and `next` for an `X.Y.Z-dev.N` version. A version is newer only when both versions are valid semver and the candidate is greater. The check SHALL NOT delay the first usable frame and SHALL NOT run for noninteractive commands. Any lookup, parse, or cache failure SHALL be silent and SHALL NOT produce a diagnostic.

A1 SHALL query the registry at most once per 24 hours per user. It SHALL keep the last successful result, its channel, and its time in a user-level cache file under the A1 configuration directory, written atomically, and SHALL answer from a fresh cache for the same channel without network access. A missing, unreadable, malformed, stale, or other-channel cache SHALL cause a background query instead of an error.

Bare A1 SHALL apply its `Update` mode after discovery. `Auto` SHALL request a silent exact-target background update after the first usable frame and SHALL show no availability notice. `Notify` SHALL preserve the existing check-only behavior and update-available popup, including the channel-appropriate manual command and stable changelog link, and SHALL install nothing. `No` SHALL skip the check entirely so updates remain user-driven. `a1 pi`, which does not expose the A1 setting, SHALL use `Auto` when otherwise eligible.

Both `Auto` and `Notify` SHALL be skipped when `PI_OFFLINE` is truthy, when `A1_SKIP_VERSION_CHECK` is truthy, when `CI` is truthy, when standard output is not a terminal, or when the running version is a source-checkout version without a numeric development suffix.

#### Scenario: A newer stable release exists
- **WHEN** a stable `0.3.0` build starts interactively in `Auto` mode and the `latest` dist-tag is `0.3.1`
- **THEN** A1 SHALL request a silent background update to exact stable release `0.3.1`
- **AND** SHALL NOT show `Update Available` or instruct the user to run `a1 update`

#### Scenario: A newer development release exists
- **WHEN** a `0.3.1-dev.640` build starts interactively in `Auto` mode and the `next` dist-tag is `0.3.1-dev.652`
- **THEN** A1 SHALL request a silent background update to exact development release `0.3.1-dev.652`
- **AND** it SHALL NOT inspect or install the `latest` stable release

#### Scenario: The running release is current or newer
- **WHEN** the channel's dist-tag is equal to or lower than the running version, or either version is not valid semver
- **THEN** no automatic update or availability popup SHALL be produced

#### Scenario: A fresh cache exists
- **WHEN** the cache holds a result for the running channel that is less than 24 hours old
- **THEN** A1 SHALL use it without querying the registry and SHALL apply the selected `Auto` or `Notify` behavior when that cached target is newer

#### Scenario: The registry cannot be reached
- **WHEN** the background query fails, times out, or returns malformed data
- **THEN** A1 SHALL start no update, show no notice or diagnostic, and leave any previous cache content unchanged

#### Scenario: The check is disabled
- **WHEN** any environment/profile opt-out holds or bare A1 selects `No`
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic-update worker, nor observe automatic-update state for this check

#### Scenario: Notify preserves the current popup
- **WHEN** bare A1 selects `Notify` and discovery resolves a newer release
- **THEN** A1 SHALL show the existing update-available popup with the manual command and SHALL NOT start automatic installation

#### Scenario: Auto is the default
- **WHEN** bare A1 has no persisted `updateCheck` choice
- **THEN** it SHALL resolve `Auto` and silently request installation when discovery resolves a newer release

## ADDED Requirements

### Requirement: Automatic self-update is single-owner and restart-safe

Automatic and explicit self-update SHALL share one cross-process execution lease before package mutation. The lease SHALL bind the canonical managed installation, verified process identity, channel, target version, execution mode, and acquisition time. A live owner SHALL prevent another package replacement; a dead owner MAY be reclaimed only after process identity and durable update transaction state are reconciled. A conflicting target SHALL fail closed and SHALL NOT rewrite, join, or replace the active transaction.

Automatic update coordination SHALL use bounded atomically written state under the A1 data directory. That state MAY describe a running, installed, or failed attempt, but successful installation SHALL be established only by the ordinary update transaction and an approved active cohort whose version satisfies the exact target. Concurrent sessions SHALL observe one owner rather than starting duplicate workers. An interrupted attempt SHALL remain resumable through the existing transaction and recovery lifecycle. A failed target SHALL use a 24-hour automatic retry cooldown, while a strictly newer discovered target and an explicit update command MAY attempt without waiting for that cooldown.

#### Scenario: Concurrent sessions discover one target
- **WHEN** two interactive sessions discover the same newer release at the same time
- **THEN** exactly one automatic worker SHALL own package replacement and the other session SHALL observe its state

#### Scenario: An explicit update overlaps automatic work
- **WHEN** `a1 update` is invoked while a live automatic worker owns the installation
- **THEN** the command SHALL report that an update is already in progress and SHALL NOT start a second package replacement

#### Scenario: Automatic work overlaps another target
- **WHEN** a live update owns one target and another automatic or explicit caller requests a conflicting target
- **THEN** the conflicting caller SHALL fail safely without changing the active transaction, package tree, launchers, or lease ownership

#### Scenario: The automatic owner exits
- **WHEN** the worker exits after a durable update phase and its process identity is no longer live
- **THEN** a later eligible worker SHALL reconcile the lease and resume or roll back through the existing update recovery rules

#### Scenario: The automatic attempt fails
- **WHEN** registry, permission, package replacement, certification, warmup, or activation work fails
- **THEN** A1 SHALL record bounded failed-attempt state, retain ordinary rollback/recovery guarantees, show no automatic failure popup, and avoid retrying that target during the cooldown

### Requirement: Automatic self-update never disrupts a running session

The automatic-update worker SHALL execute from the selected immutable release without inheriting the terminal and SHALL continue independently when the initiating interactive process exits. Before ownership shutdown, package rename, transaction creation, or replacement, automatic mode SHALL verify that every live update owner executes from a retained immutable release. It SHALL leave those owners and their sessions running while installing and activating the target.

If a live owner executes from the mutable npm package tree or otherwise cannot be proven safe to retain, automatic mode SHALL stop before mutation and SHALL NOT request shutdown or terminate the session. Explicit `a1 update` SHALL retain its existing consent-backed lifecycle behavior. Automatic mode SHALL otherwise reuse the same managed-installation verification, prefix pinning, protected replacement, launcher recovery, transaction, rollback, materialization, certification, warmup, supervisor verification, active-reference commit, and cleanup guarantees as explicit update.

#### Scenario: Current sessions use immutable releases
- **WHEN** automatic update starts while one or more verified sessions execute from retained immutable release roots
- **THEN** A1 SHALL leave those sessions running, install and activate the newer release, and admit later launches to the new release

#### Scenario: A legacy session uses the mutable installation
- **WHEN** automatic update finds a verified live owner executing from the npm package tree being replaced
- **THEN** it SHALL stop before transaction creation or package mutation and SHALL NOT end that session
- **AND** the user MAY still run the explicit update command to perform the existing consent-backed transition

#### Scenario: The initiating terminal closes
- **WHEN** the interactive process that requested automatic update exits after the detached worker starts
- **THEN** the worker SHALL continue or leave resumable durable state without requiring that terminal to remain open

### Requirement: Explicit update commands remain available

A1 SHALL retain `a1 update`, `a1 update --develop`, and named development preview forms as explicit noninteractive update commands. Automatic startup update SHALL NOT remove, rename, redirect, or weaken those commands. Explicit commands SHALL continue to print progress and actionable failure diagnostics and SHALL remain the supported route for deliberate channel changes, specific preview selection, immediate retry, and troubleshooting.

#### Scenario: User requests the stable channel explicitly
- **WHEN** the user runs `a1 update`
- **THEN** A1 SHALL execute the existing visible stable update workflow subject to the shared execution lease

#### Scenario: User requests a named preview
- **WHEN** the user runs `a1 update --develop 107` or names a full published preview version
- **THEN** A1 SHALL preserve the existing exact preview resolution and installation behavior
