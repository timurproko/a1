## MODIFIED Requirements

### Requirement: Sole public command exposes self-update
A1 SHALL recognize `update` as a non-interactive subcommand through the sole public
`a1` executable. `a1 update` SHALL select the channel of the running release: the
stable release when the running version has no prerelease part, and the current
development preview when it is a `-dev.N` build. `a1 update --release` SHALL select
the stable release. `a1 update --develop` SHALL select the current development
preview, and one optional value after `--develop` SHALL select either a positive
numbered preview or a full numbered preview version.

`a1 update --models` and `a1 pi update --models` SHALL be equivalent model-catalog
refresh commands against the A1 profile and SHALL NOT self-update A1 or its pinned
Pi runtime. `--models` SHALL NOT combine with `--release`, `--develop`, or a preview value.

#### Scenario: Update through a1
- **WHEN** the user invokes `a1 update` while a stable release runs
- **THEN** A1 SHALL run the stable self-update workflow

#### Scenario: Update a development build
- **WHEN** the user invokes `a1 update` while a `-dev.N` build runs
- **THEN** A1 SHALL run the development-channel self-update workflow and SHALL NOT install the stable release

#### Scenario: Move to the stable release explicitly
- **WHEN** the user invokes `a1 update --release`
- **THEN** A1 SHALL run the stable self-update workflow from either channel

#### Scenario: Update in Pi's spelling
- **WHEN** the user invokes the removed `a1 update self` form
- **THEN** A1 SHALL return successfully and silently without registry or update work

#### Scenario: Update installed packages
- **WHEN** the user invokes `a1 pi update --extensions`
- **THEN** A1 SHALL update the packages configured in the A1 profile and SHALL NOT self-update

#### Scenario: Update one package
- **WHEN** the user invokes `a1 pi update <source>` for a configured package source
- **THEN** A1 SHALL update that package alone and SHALL NOT self-update

#### Scenario: Refresh model catalogs
- **WHEN** the user invokes `a1 update --models`
- **THEN** A1 SHALL refresh the model catalogs of the A1 profile and SHALL NOT self-update

#### Scenario: Pinned Pi is targeted
- **WHEN** the user invokes `a1 update pi`
- **THEN** A1 SHALL fail before update work and explain that Pi is pinned to the certified A1 release

#### Scenario: Update current development A1
- **WHEN** the user invokes `a1 update --develop`
- **THEN** A1 SHALL run the development-channel self-update workflow

#### Scenario: Update one numbered development preview
- **WHEN** the user invokes `a1 update --develop 107`
- **THEN** A1 SHALL resolve the unique published preview ending in `-dev.107` and install it

#### Scenario: Update one exact development preview
- **WHEN** the user invokes `a1 update --develop 0.1.8-dev.107`
- **THEN** A1 SHALL validate and install that exact published preview

#### Scenario: Refresh models in top-level notation
- **WHEN** the user invokes `a1 update --models`
- **THEN** A1 SHALL refresh A1's model catalogs without self-update

#### Scenario: Refresh models in Pi-compatible notation
- **WHEN** the user invokes `a1 pi update --models`
- **THEN** A1 SHALL perform the same model refresh as `a1 update --models`

#### Scenario: Update selectors conflict
- **WHEN** `--release`, `--develop`, its optional preview value, or `--models` are combined outside the declared grammar
- **THEN** A1 SHALL fail before registry, package, supervisor, or runtime work

### Requirement: Channel-head update never downgrades

When `a1 update`, `a1 update --release`, or `a1 update --develop` without a named preview resolves a channel head that is lower than the running version on the same channel, A1 SHALL report that it is already current and exit successfully without replacing the installation. An explicitly named development preview, and an explicit `--release` move from a development build to the stable channel, SHALL keep their existing resolution and installation behavior. Bare `a1 update` SHALL never change channel.

#### Scenario: The registry tag is lower than the running release
- **WHEN** the running stable release is `0.3.1` and npm reports `latest` as `0.3.0`
- **THEN** `a1 update` SHALL report that A1 is current and SHALL NOT start an update transaction

#### Scenario: A named preview is requested
- **WHEN** the user runs `a1 update --develop 630` while a later development release is running
- **THEN** A1 SHALL resolve and install preview 630 as it does today

#### Scenario: A development build runs bare update
- **WHEN** the running version is `0.2.7-dev.1240` and npm reports `latest` as `0.2.6`
- **THEN** `a1 update` SHALL resolve the development channel and SHALL NOT install `0.2.6`

### Requirement: Explicit update commands remain available

A1 SHALL retain `a1 update`, `a1 update --release`, `a1 update --develop`, and named development preview forms as explicit noninteractive update commands. Automatic startup update SHALL NOT remove, rename, redirect, or weaken those commands. Explicit commands SHALL continue to print progress and actionable failure diagnostics. `--release` and `--develop` SHALL remain the supported routes for deliberate channel changes; named previews remain the route for specific preview selection, immediate retry, and troubleshooting.

#### Scenario: User requests the stable channel explicitly
- **WHEN** the user runs `a1 update --release`
- **THEN** A1 SHALL execute the existing visible stable update workflow subject to the shared execution lease

#### Scenario: User requests a named preview
- **WHEN** the user runs `a1 update --develop 107` or names a full published preview version
- **THEN** A1 SHALL preserve the existing exact preview resolution and installation behavior

## ADDED Requirements

### Requirement: Continuity-deferred activation is a successful update
When a certified prepared candidate is blocked only because a live resident source cannot yet be proven controllable, an explicit update SHALL exit with status zero and print one result line naming the target and saying that it takes over automatically, with no blocker sentence or instruction to retry. The prepared candidate SHALL activate through the existing activation-only retry as soon as continuity can be established, without another npm installation and without user action. A source whose recorded owner process is provably gone SHALL NOT defer activation. Continuity inspection SHALL produce a verdict per source, so one unreadable historical source cannot veto the others.

#### Scenario: A live Agent runs during update
- **WHEN** the user runs `a1 update` while a resident Agent of an older release is busy and continuity is not yet provable
- **THEN** the command SHALL exit zero with that single result line
- **AND** the Agent SHALL keep running and the candidate SHALL activate once continuity holds

#### Scenario: A dead legacy host left records behind
- **WHEN** a namespace's registry names a server whose recorded process is gone
- **THEN** activation SHALL proceed without waiting for that namespace

### Requirement: Routine update outcomes are quiet
Explicit update SHALL print progress and exactly one result line for success, already-current, and deferred-activation outcomes. A failure the user must act on SHALL print one line holding a concise reason and one next step, followed by `Details: <log path>` when diagnostics were recorded. Bounded native host-command stderr and child diagnostics SHALL be captured into that update log rather than discarded or printed raw. Messages SHALL NOT repeat a sentence or end in doubled punctuation.

#### Scenario: Native continuity check reports a reason
- **WHEN** the resident workspace check exits unsuccessfully with a stderr reason
- **THEN** the reason SHALL be recorded in the update log
- **AND** the terminal SHALL show it only if the outcome is an actionable failure

#### Scenario: Update succeeds
- **WHEN** an explicit update installs and activates the target
- **THEN** the terminal SHALL show only progress and the result line
