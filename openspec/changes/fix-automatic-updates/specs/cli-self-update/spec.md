## MODIFIED Requirements

### Requirement: Interactive startup checks for a newer release on the running channel

When an interactive profile (`a1` or `a1 pi`) starts from a published build, A1 SHALL determine whether a newer release exists on the channel applicable to the selected update mode. In `Auto`, the applicable version SHALL be the immutable release executing the session. In `Notify`, the applicable version SHALL be the installed package that accepted the public launch command when current launch context provides that validated version; otherwise it SHALL fall back to the executing version. A version without a prerelease component SHALL select npm dist-tag `latest`, and an `X.Y.Z-dev.N` version SHALL select `next`. A version is newer only when both versions are valid semver and the candidate is greater than the applicable version. Discovery SHALL NOT delay the first usable frame and SHALL NOT run for noninteractive commands. Lookup, parse, or cache failure SHALL NOT produce a UI diagnostic.

A1 SHALL keep independent bounded atomic user-level cache records for the stable and development channels under its configuration directory. In `Auto`, a successful result for the applicable channel SHALL be reused for at most fifteen minutes; the first check and later checks while the same interactive process remains alive SHALL fetch the channel tag after that record expires, without requiring a restart. A1 SHALL bound concurrent stale refreshes from multiple sessions and use the same certified release activation/lease path for every eligible discovered target. In `Notify`, discovery SHALL remain startup-only and SHALL reuse a same-channel successful result for up to 24 hours. An old single-channel cache MAY be reused only when its channel and timestamp satisfy the selected mode's freshness bound. A missing, unreadable, malformed, expired, or other-channel entry SHALL cause a bounded background query instead of an error. A failed query SHALL leave the prior successful record unchanged and SHALL allow a later bounded retry.

Bare A1 SHALL apply its `Update` mode after discovery. `Auto` SHALL request a silent exact-target background update after the first usable frame and SHALL show no availability notice. `Notify` SHALL preserve the existing check-only behavior and update-available popup, including the channel-appropriate manual command and stable changelog link, and SHALL install nothing. `No` SHALL skip the check entirely so updates remain user-driven. `a1 pi`, which does not expose the A1 setting, SHALL use `Auto` when otherwise eligible.

Both `Auto` and `Notify` SHALL be skipped when `PI_OFFLINE` is truthy, when `A1_SKIP_VERSION_CHECK` is truthy, when `CI` is truthy, when standard output is not a terminal, or when the applicable version is a source-checkout version without a numeric development suffix. Session disposal SHALL cancel later checks and observation without cancelling a detached worker already performing a certified installation.

#### Scenario: A newer stable release exists
- **WHEN** a stable `0.3.0` build runs interactively in `Auto` mode and the `latest` dist-tag advances to `0.3.1`
- **THEN** A1 SHALL discover and request a silent exact-target background update to `0.3.1` within the next eligible discovery interval, even if that session was already open
- **AND** SHALL NOT inspect or install the development `next` release or show an availability popup

#### Scenario: A newer development release exists
- **WHEN** a numbered `0.3.1-dev.640` build runs interactively in `Auto` mode and the `next` dist-tag advances to `0.3.1-dev.652`
- **THEN** A1 SHALL discover and request a silent exact-target background update to `0.3.1-dev.652` within the next eligible discovery interval, even if a prior check cached `640`
- **AND** SHALL NOT inspect or install the stable `latest` release

#### Scenario: The running release is current or newer
- **WHEN** the applicable channel's dist-tag is equal to or lower than the applicable version, or either version is not valid semver
- **THEN** no automatic update or availability popup SHALL be produced

#### Scenario: A fresh cache exists
- **WHEN** the cache holds a successful result for the applicable channel within the selected mode's freshness window
- **THEN** A1 SHALL reuse it without querying the registry and SHALL apply `Auto` or `Notify` behavior only if that result is newer

#### Scenario: A publication follows a cached result
- **WHEN** a new version appears after an Auto-mode check cached the old head and the session remains open or restarts
- **THEN** the next eligible check after at most fifteen minutes SHALL fetch the new tag and request its installation without a manual update command

#### Scenario: The registry cannot be reached
- **WHEN** a background query fails, times out, or returns malformed data
- **THEN** A1 SHALL start no update, show no notice, retain any previous cache content, and retry on a later bounded check rather than treating the failed lookup as a successful fresh result

#### Scenario: The check is disabled
- **WHEN** any environment/profile opt-out holds or bare A1 selects `No`
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic-update worker, nor observe automatic-update state for this check

#### Scenario: Notify preserves the current popup
- **WHEN** bare A1 selects `Notify` and startup discovery resolves a newer release on the applicable channel
- **THEN** A1 SHALL show the existing update-available popup with the channel-appropriate manual command and SHALL NOT start automatic installation or later Auto-mode polling

#### Scenario: Stable notify follows the invoking package
- **WHEN** a stable installed package starts in `Notify` mode but ordinary launch selection executes an approved development runtime
- **THEN** A1 SHALL inspect only `latest`, compare it with the stable invoking package version, and show `a1 update` only when a newer stable release exists
- **AND** SHALL NOT announce the `next` development preview or show `a1 update --develop`

#### Scenario: Development notify follows the invoking package
- **WHEN** a development installed package starts in `Notify` mode but ordinary launch selection executes an approved stable runtime
- **THEN** A1 SHALL inspect only `next`, compare it with the development invoking package version, and show `a1 update --develop` only when a newer development preview exists
- **AND** SHALL NOT announce the `latest` stable release

#### Scenario: Notify has no invocation metadata
- **WHEN** `Notify` starts through a supported path that supplies no invocation-version launch context
- **THEN** A1 SHALL use the executing published version as the channel and comparison baseline

#### Scenario: Auto is the default
- **WHEN** bare A1 has no persisted `updateCheck` choice
- **THEN** it SHALL resolve `Auto` and silently request installation when discovery resolves a newer release

### Requirement: Automatic self-update is single-owner and restart-safe

Automatic and explicit self-update SHALL share one cross-process execution lease before package mutation. The lease SHALL bind the canonical managed installation, verified process identity, channel, target version, execution mode, and acquisition time. A live owner SHALL prevent another package replacement. A dead owner whose durable transaction names the same target as the new request MAY be reclaimed after process identity and transaction state are reconciled. A dead owner whose durable transaction names a different target SHALL be settled by an explicit update before it proceeds: the explicit command SHALL roll that transaction back to its recorded prior verified cohort through the existing rollback path, finish it as rolled back, remove the stale lease, and report in one line which interrupted target it rolled back, then continue with its own target. Automatic mode SHALL still fail closed on a foreign target and SHALL NOT rewrite, join, replace, or roll back another transaction. A dead attempt SHALL NOT be reported as in progress.

Automatic update coordination SHALL use bounded atomically written state under the A1 data directory. That state MAY describe a running, installed, or failed attempt, but successful installation SHALL be established only by the ordinary update transaction and an approved active cohort whose version satisfies the exact target. Concurrent sessions SHALL observe one owner rather than starting duplicate workers. A missing or dead worker with a stale `running` document SHALL be reconciled against its lease, transaction, and approved active cohort, without treating that document as evidence of an ongoing installation or an installed release. Worker failures before or after lease acquisition SHALL record a bounded failure when safely attributable to that attempt. An interrupted attempt SHALL remain resumable through the existing transaction and recovery lifecycle. A failed target SHALL use a 24-hour automatic retry cooldown, while a strictly newer discovered target and an explicit update command MAY attempt without waiting for that cooldown.

#### Scenario: Concurrent sessions discover one target
- **WHEN** two interactive sessions discover the same newer release at the same time
- **THEN** exactly one automatic worker SHALL own package replacement and the other session SHALL observe its state

#### Scenario: An explicit update overlaps automatic work
- **WHEN** `a1 update` is invoked while a live automatic worker owns the installation
- **THEN** the command SHALL report that an update is already in progress and SHALL NOT start a second package replacement

#### Scenario: Automatic work overlaps another target
- **WHEN** a live update owns one target and another automatic or explicit caller requests a conflicting target
- **THEN** the conflicting caller SHALL fail safely without changing the active transaction, package tree, launchers, or lease ownership

#### Scenario: A dead owner left another target behind
- **WHEN** `a1 update --develop 828` runs while the lease names a process that is not alive and the active transaction targets `0.2.7-dev.835`
- **THEN** A1 SHALL roll the `0.2.7-dev.835` transaction back to its prior verified cohort, remove the stale lease, say that the interrupted `0.2.7-dev.835` update was rolled back, and install preview 828
- **AND** an automatic worker meeting the same state SHALL fail closed without touching that transaction

#### Scenario: The automatic owner exits
- **WHEN** the worker exits after a durable update phase and its process identity is no longer live
- **THEN** a later eligible worker SHALL reconcile the lease and resume or roll back through the existing update recovery rules

#### Scenario: A stale running record has no owner
- **WHEN** a coordinator file still says `running` but no matching live lease or transaction remains
- **THEN** A1 SHALL NOT treat it as a live update or an installed release and SHALL safely settle its status before another eligible attempt

#### Scenario: The automatic attempt fails
- **WHEN** registry, worker startup, permission, package replacement, certification, warmup, or activation work fails
- **THEN** A1 SHALL record bounded failed-attempt state when an attempt began, retain ordinary rollback/recovery guarantees, show no automatic failure popup, and avoid retrying that target during the cooldown
