## ADDED Requirements

### Requirement: Immutable release retention is age-based
Release retention SHALL need no supervisor, cohort registry, or live-instance inventory. At update time and at every launch, A1 SHALL keep the approved active release, the executing release, and every release approved within the last seven days, remove the rest with their unreferenced dependency layers, and print nothing on success.

#### Scenario: An old release is collected
- **WHEN** a launch finds a release approved more than seven days ago that is neither active nor executing
- **THEN** that release and its unreferenced dependency layers SHALL be removed before the UI starts, without delaying the first frame

#### Scenario: A recent release is kept
- **WHEN** a release was approved within the last seven days but is no longer active
- **THEN** it SHALL remain on disk so sessions started from it keep running

#### Scenario: The record cannot be read
- **WHEN** a release's approval record is missing or malformed
- **THEN** retention SHALL keep that release and continue

### Requirement: Interactive startup checks for a newer release in Auto mode
When an interactive profile starts from a published build and the `Update` mode is not `No`, A1 SHALL discover whether a newer release exists on the executing release's channel, comparing valid semver only, after the first usable frame and never for noninteractive commands. `Auto` SHALL request a silent exact-target background update and show no availability notice; `No` SHALL skip the check entirely. Lookup, parse, or cache failure SHALL produce no UI diagnostic.

#### Scenario: A newer stable release exists
- **WHEN** a stable `0.3.0` build runs interactively in `Auto` mode and the `latest` dist-tag advances to `0.3.1`
- **THEN** A1 SHALL discover and request a silent exact-target background update to `0.3.1` within the next eligible discovery interval, even if that session was already open
- **AND** SHALL NOT inspect or install the development `next` release or show an availability popup

#### Scenario: A newer development release exists
- **WHEN** a numbered `0.3.1-dev.640` build runs interactively in `Auto` mode and the `next` dist-tag advances to `0.3.1-dev.652`
- **THEN** A1 SHALL discover and request a silent exact-target background update to `0.3.1-dev.652` within the next eligible discovery interval, even if a prior check cached `640`
- **AND** SHALL NOT inspect or install the stable `latest` release

#### Scenario: The running release is current or newer
- **WHEN** the applicable channel's dist-tag is equal to or lower than the executing version, or either version is not valid semver
- **THEN** no automatic update SHALL be produced

#### Scenario: A fresh cache exists
- **WHEN** the cache holds a successful result for the applicable channel within the fifteen-minute window
- **THEN** A1 SHALL reuse it without querying the registry and SHALL request installation only if that result is newer

#### Scenario: A publication follows a cached result
- **WHEN** a new version appears after an Auto-mode check cached the old head and the session remains open or restarts
- **THEN** the next eligible check after at most fifteen minutes SHALL fetch the new tag and request its installation without a manual update command

#### Scenario: The registry cannot be reached
- **WHEN** a background query fails, times out, or returns malformed data
- **THEN** A1 SHALL start no update, show no notice, retain any previous cache content, and retry on a later bounded check rather than treating the failed lookup as a successful fresh result

#### Scenario: The check is disabled
- **WHEN** any environment opt-out holds or bare A1 selects `No`
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic-update worker, nor observe automatic-update state for this check

#### Scenario: Auto is the default
- **WHEN** bare A1 has no persisted `updateCheck` choice
- **THEN** it SHALL resolve `Auto` and silently request installation when discovery resolves a newer release

#### Scenario: The channel follows the executing version
- **WHEN** the executing version has no prerelease component
- **THEN** discovery SHALL read npm dist-tag `latest`
- **AND** an `X.Y.Z-dev.N` version SHALL read `next` and SHALL never inspect the other channel

#### Scenario: Channel results are cached per channel
- **WHEN** a check succeeds for the executing release's channel
- **THEN** A1 SHALL store it in a bounded atomic per-channel cache under its configuration directory and reuse it for at most fifteen minutes
- **AND** a missing, malformed, expired, or other-channel entry SHALL cause a bounded background query, with stale refreshes bounded across sessions

#### Scenario: An environment opt-out applies
- **WHEN** `PI_OFFLINE`, `A1_SKIP_VERSION_CHECK`, or `CI` is truthy, standard output is not a terminal, or the executing version is an unnumbered source checkout
- **THEN** no check SHALL run

#### Scenario: The session is disposed
- **WHEN** the interactive session ends while a check is pending
- **THEN** later checks SHALL be cancelled without cancelling a detached worker that is already installing

#### Scenario: The comparison profile runs
- **WHEN** prerelease `a1 pi` starts eligible for discovery
- **THEN** it SHALL behave as `Auto` because it exposes no A1 `Update` setting

### Requirement: Automatic self-update is single-owner and restart-safe without activation blocking
Automatic and explicit self-update SHALL share one cross-process execution lease, bound to the managed installation, process identity, channel, target, mode, and acquisition time, before mutation or activation. A live owner SHALL block other replacements; a dead owner SHALL be reconciled against its lease and transaction and never reported as in progress. Success SHALL be established only by the update transaction and an approved active release. There SHALL be no activation-blocked state.

#### Scenario: Concurrent sessions discover one target
- **WHEN** two interactive sessions discover the same newer release at the same time
- **THEN** exactly one automatic worker SHALL own package replacement and activation and the other session SHALL observe its state

#### Scenario: An explicit update overlaps automatic work
- **WHEN** `a1 update` is invoked while a live automatic worker owns installation or activation
- **THEN** the command SHALL report that an update is already in progress and SHALL NOT start a second package replacement or activation commit

#### Scenario: Automatic work overlaps another target
- **WHEN** a live update owns one target and another automatic or explicit caller requests a conflicting target
- **THEN** the conflicting caller SHALL fail safely without changing the active transaction, package tree, launchers, or lease ownership

#### Scenario: A dead owner left another target behind
- **WHEN** `a1 update --develop 828` runs while the lease names a process that is not alive and the active transaction targets `0.2.7-dev.835`
- **THEN** A1 SHALL roll the `0.2.7-dev.835` transaction back to its prior verified release, remove the stale lease, say that the interrupted `0.2.7-dev.835` update was rolled back, and install preview 828
- **AND** an automatic worker meeting the same state SHALL fail closed without touching that transaction

#### Scenario: The automatic owner exits
- **WHEN** the worker exits after a durable update phase and its process is no longer live
- **THEN** a later eligible worker SHALL reconcile the lease and resume or roll back through the existing update recovery rules

#### Scenario: A stale running record has no owner
- **WHEN** a coordinator file still says `running` but no matching live lease or transaction remains
- **THEN** A1 SHALL NOT treat it as a live update or an installed release and SHALL safely settle its status before another eligible attempt

#### Scenario: The automatic attempt fails
- **WHEN** registry, worker startup, permission, package replacement, recovery, certification, warmup, or activation work fails
- **THEN** A1 SHALL record bounded failed-attempt state when an attempt began, retain ordinary rollback/recovery guarantees, show no raw automatic failure popup, and avoid retrying that target during the cooldown

#### Scenario: A failed target waits for its cooldown
- **WHEN** an attempt at a target fails in registry, replacement, recovery, materialization, certification, warmup, or activation work
- **THEN** automatic mode SHALL NOT retry that target for 24 hours
- **AND** a strictly newer discovered target or an explicit update command MAY proceed without waiting

### Requirement: Automatic self-update leaves running sessions on their release
The automatic-update worker SHALL execute from the selected immutable release without inheriting the terminal and SHALL continue when the initiating process exits. It SHALL leave every running session untouched: running processes keep the immutable release they started from, and the next launch selects the new one. Automatic mode SHALL reuse the explicit update's verification, replacement, recovery, transaction, rollback, certification, warmup, activation, and retention guarantees.

#### Scenario: Current sessions use immutable releases
- **WHEN** automatic update starts while one or more sessions execute from retained immutable release roots
- **THEN** A1 SHALL leave those sessions running, install and activate the newer release, and admit later launches to the new release

#### Scenario: The initiating terminal closes
- **WHEN** the interactive process that requested automatic update exits after the detached worker starts
- **THEN** the worker SHALL continue or leave resumable durable state without requiring that terminal to remain open

#### Scenario: Explicit update keeps its progress
- **WHEN** the user runs an explicit `a1 update` command
- **THEN** progress and actionable diagnostics SHALL remain visible in the invoking terminal and no second terminal window SHALL open

### Requirement: Routine update outcomes print one result line
Explicit update SHALL print progress and exactly one result line for success and already-current outcomes. A failure the user must act on SHALL print one line holding a concise reason and one next step, followed by `Details: <log path>` when diagnostics were recorded. Child diagnostics SHALL be captured into that update log rather than discarded or printed raw. Messages SHALL NOT repeat a sentence or end in doubled punctuation.

#### Scenario: Update succeeds
- **WHEN** an explicit update installs and activates the target
- **THEN** the terminal SHALL show only progress and the result line

#### Scenario: Update is already current
- **WHEN** the selected channel head equals the installed version
- **THEN** the terminal SHALL show one result line and no diagnostics

## MODIFIED Requirements

### Requirement: Restart-readiness observation is independent of release discovery
Every interactive published A1 process SHALL compare its executing immutable release with the locally recorded approved active release on a bounded short cadence. This local comparison SHALL not require a registry request, a successful dist-tag lookup, ownership of the automatic-update worker, or evidence that the process launched the active release. When the active release is valid semver, belongs to the executing release's channel, and is newer, the process SHALL report restart readiness and stop polling after that result. Unreadable, malformed, unapproved, same-version, older, source-checkout, and cross-channel state SHALL not produce restart readiness.

The local comparison SHALL remain available when update discovery is `No`, when registry lookup fails, and when network-oriented version checks are disabled, because it reads only already-committed local release state and starts no update. Disposal SHALL cancel the local observer.

#### Scenario: Another process activates the update
- **WHEN** one process activates an approved same-channel release newer than several still-running A1 processes
- **THEN** every older process SHALL report restart readiness within the bounded local observation interval
- **AND** none SHALL need to have launched, discovered, or installed the active version itself

#### Scenario: Registry discovery fails
- **WHEN** an older process cannot fetch or parse its channel dist-tag but the local approved active release is newer on the same channel
- **THEN** it SHALL still report restart readiness from local state
- **AND** the failed discovery SHALL start no additional update

#### Scenario: Update discovery is disabled
- **WHEN** a published older process uses `No`, or a network version-check opt-out applies, while a newer same-channel approved release is already active locally
- **THEN** the process SHALL report restart readiness without reading the release cache or contacting the registry

#### Scenario: Local state does not prove staleness
- **WHEN** local release state is missing, unreadable, malformed, unapproved, equal, older, cross-channel, or compared with an unpublished executing version
- **THEN** A1 SHALL show no restart readiness and SHALL perform no mutation

### Requirement: Restart update notification describes a usable user action

The normal update status SHALL show the existing green `Update installed, restart to update` text only when an approved successor is durably active and an ordinary restart selects it. No other automatic-update state SHALL appear in the normal status line; failures remain in bounded diagnostics. Replacing failure wording SHALL NOT manufacture installation success.

#### Scenario: User restarts after background installation
- **WHEN** an automatic update commits an approved successor and the user exits and runs `a1` again after the green restart instruction
- **THEN** the new process SHALL run the successor release and SHALL show no satisfied restart notice

#### Scenario: Automatic activation has not completed
- **WHEN** an automatic attempt is still running or has failed
- **THEN** normal status SHALL display neither internal terminology nor a false installed/restart-ready notice
- **AND** bounded diagnostic evidence SHALL retain the failure reason while safe automatic recovery continues

## REMOVED Requirements

### Requirement: Update activation preserves a usable control path to live Agents
**Reason**: There are no resident agents to reconnect; activation no longer inspects continuity.

**Migration**: None. Running sessions keep their release; the next launch uses the new one.

### Requirement: Post-update relaunch reconnects the same live workspace
**Reason**: There is no live workspace to reconnect; bare `a1` starts a fresh session.

**Migration**: Resume a previous conversation with `a1 --session <id>`.

### Requirement: Native resident clients observe committed update activation
**Reason**: The native attach client is removed; the owned UI's own restart-readiness observer shows the notice.

**Migration**: None.

### Requirement: Transient continuity inspection delays recover without user repair
**Reason**: Continuity inspection is removed with resident tabs.

**Migration**: None.

### Requirement: Continuity-deferred activation is a successful update
**Reason**: Activation is never deferred; a certified candidate activates when its transaction commits.

**Migration**: None.

### Requirement: Interactive startup checks for a newer release on the running channel
**Reason**: The `Notify` mode, its popup, and invoking-package channel selection are removed.

**Migration**: Stored `notify` resolves to `Auto`.

### Requirement: Automatic self-update is single-owner and restart-safe
**Reason**: Resident continuity inspection and activation-blocked retries are removed.

**Migration**: None.

### Requirement: Automatic self-update never disrupts a running session
**Reason**: There is no supervisor or mutable-tree legacy owner to verify; running processes simply keep their immutable release.

**Migration**: None.

### Requirement: Routine update outcomes are quiet
**Reason**: Native host-command diagnostics and deferred-activation outcomes no longer exist.

**Migration**: None.
