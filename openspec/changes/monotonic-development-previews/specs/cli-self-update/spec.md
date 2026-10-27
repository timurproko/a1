# cli-self-update Delta

## MODIFIED Requirements

### Requirement: A preview can be installed by name
The value after `--develop` SHALL say which preview to move to. A positive decimal
SHALL name a preview by its pull request number, and a full version SHALL name it
outright. A preview is published as `<version>-dev.<pull-request>` or as
`<version>-dev.<count>.<pull-request>`, so the pull request number alone SHALL be
enough to identify one in either shape, and the version in front of it SHALL NOT
have to be supplied.

The named preview SHALL be resolved against the versions the registry actually
published rather than constructed from the name. A name matching nothing SHALL be
refused and named in the refusal; a name matching more than one published version
SHALL be refused rather than resolved to a guess. Nothing SHALL be installed in
either case.

What may be named there is a preview. A published release named there SHALL be
refused, SHALL be told apart from a preview in the refusal, and SHALL point at the
command that moves to the current release — installing a release through the
preview path would record it as something it is not.

An empty or unusable name SHALL be refused before anything is asked of the
registry.

#### Scenario: A commit is named
- **WHEN** the user runs `a1 update --develop <pr>` for a pull request whose preview was published as `<version>-dev.<pr>` or `<version>-dev.<count>.<pr>`
- **THEN** A1 SHALL install that preview, whatever version it carries

#### Scenario: A full version is named
- **WHEN** the user runs `a1 update --develop <version>` for a published preview version in either shape
- **THEN** A1 SHALL install that version

#### Scenario: A release is named
- **WHEN** the user names a published release rather than a preview
- **THEN** A1 SHALL refuse, say that it is a release, point at the release command, and install nothing

#### Scenario: The name matches nothing
- **WHEN** the named pull request or version was never published
- **THEN** A1 SHALL refuse, name what it could not find, and install nothing

#### Scenario: The name matches more than one version
- **WHEN** a pull request number appears as the last identifier of more than one published version
- **THEN** A1 SHALL refuse, list what it found, and ask for a version instead

#### Scenario: The newest preview is wanted
- **WHEN** the user runs `a1 update --develop` with no value
- **THEN** A1 SHALL install whatever the preview channel currently points at, subject to the channel-head downgrade rule

### Requirement: Development preview selectors are strict
A value after `--develop` SHALL be either a positive decimal or an exact semantic
version matching `<major>.<minor>.<patch>-dev.<positive-decimal>` or
`<major>.<minor>.<patch>-dev.<positive-decimal>.<positive-decimal>`. A stable
version, zero, source hash, dotted pair without a version, unknown flag, second
value, or missing value for another option SHALL fail before registry discovery or
installation.

#### Scenario: Zero is selected
- **WHEN** the user runs `a1 update --develop 0`
- **THEN** A1 SHALL fail without registry or installation work

#### Scenario: Stable version is selected
- **WHEN** the user runs `a1 update --develop 0.1.8`
- **THEN** A1 SHALL fail without registry or installation work

#### Scenario: A dotted pair without a version is selected
- **WHEN** the user runs `a1 update --develop 1218.828`
- **THEN** A1 SHALL fail without registry or installation work

#### Scenario: Extra selector is supplied
- **WHEN** the user runs `a1 update --develop 107 108`
- **THEN** A1 SHALL fail without registry or installation work

### Requirement: Automatic self-update is single-owner and restart-safe

Automatic and explicit self-update SHALL share one cross-process execution lease before package mutation. The lease SHALL bind the canonical managed installation, verified process identity, channel, target version, execution mode, and acquisition time. A live owner SHALL prevent another package replacement. A dead owner whose durable transaction names the same target as the new request MAY be reclaimed after process identity and transaction state are reconciled. A dead owner whose durable transaction names a different target SHALL be settled by an explicit update before it proceeds: the explicit command SHALL roll that transaction back to its recorded prior verified cohort through the existing rollback path, finish it as rolled back, remove the stale lease, and report in one line which interrupted target it rolled back, then continue with its own target. Automatic mode SHALL still fail closed on a foreign target and SHALL NOT rewrite, join, replace, or roll back another transaction. A dead attempt SHALL NOT be reported as in progress.

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

#### Scenario: A dead owner left another target behind
- **WHEN** `a1 update --develop 828` runs while the lease names a process that is not alive and the active transaction targets `0.2.7-dev.835`
- **THEN** A1 SHALL roll the `0.2.7-dev.835` transaction back to its prior verified cohort, remove the stale lease, say that the interrupted `0.2.7-dev.835` update was rolled back, and install preview 828
- **AND** an automatic worker meeting the same state SHALL fail closed without touching that transaction

#### Scenario: The automatic owner exits
- **WHEN** the worker exits after a durable update phase and its process identity is no longer live
- **THEN** a later eligible worker SHALL reconcile the lease and resume or roll back through the existing update recovery rules

#### Scenario: The automatic attempt fails
- **WHEN** registry, permission, package replacement, certification, warmup, or activation work fails
- **THEN** A1 SHALL record bounded failed-attempt state, retain ordinary rollback/recovery guarantees, show no automatic failure popup, and avoid retrying that target during the cooldown

## ADDED Requirements

### Requirement: An explicit update invalidates the release-check cache
When an explicit `a1 update` or `a1 update --develop` completes successfully, A1 SHALL remove the user-level release-check cache so that the next interactive launch queries the registry's current channel head instead of comparing the newly installed version against a result recorded before the update. A failed, refused, or already-current explicit update SHALL leave the cache unchanged.

#### Scenario: A named preview is installed below a cached head
- **WHEN** the cache records `0.2.7-dev.835` as the development head and the user installs `0.2.7-dev.828` by name while the registry's `next` tag is `0.2.7-dev.828`
- **THEN** the next interactive launch SHALL query the registry, find no newer release, and start no automatic update

#### Scenario: The update is refused
- **WHEN** an explicit update reports that A1 is already current or fails before replacing the package
- **THEN** the release-check cache SHALL be left as it was
