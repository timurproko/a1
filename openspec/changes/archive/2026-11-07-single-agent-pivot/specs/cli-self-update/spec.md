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

### Requirement: Update runs apart from interactive sessions
The update subcommand SHALL complete or fail without launching the TUI, launching an agent, or attaching to a running A1 session.

#### Scenario: Update is requested
- **WHEN** the user invokes the update subcommand
- **THEN** only the npm update workflow and its release activation run, and no interactive A1 process is started

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

### Requirement: Self-update is limited to the managed global installation
A1 SHALL verify through npm's global package-root resolution that the running package occupies the exact `@timurproko/a1` package location in an npm-managed global installation before replacing it. The installation MAY use npm's active default prefix or a different prefix whose inferred global root active npm independently confirms and whose complete platform launcher set targets that package. On Unix a launcher targets the package when it is a regular executable file naming the package's `bin/cli.js` entry or a symbolic link whose canonical target is exactly that package's canonical `bin/cli.js`; update recovery SHALL apply the same rule when deciding whether an installed target is callable. A1 SHALL pin replacement to the confirmed prefix that owns the running package. It SHALL refuse automatic replacement when running from a local checkout, npm link, malformed package layout, unconfirmed root, or a different package-manager context.

#### Scenario: Running package is globally managed by npm
- **WHEN** the running A1 package exactly occupies its canonical package location beneath npm's canonical active global package root
- **THEN** A1 may perform the global update against that root

#### Scenario: Running package is managed under a confirmed non-default npm prefix
- **WHEN** the running A1 package exactly occupies the canonical package location under another global root, active npm confirms that root for its inferred prefix, and the prefix's complete launcher set targets that package
- **THEN** A1 SHALL update the invoked installation in place using that explicit prefix
- **AND** SHALL NOT create or select an installation under the active default prefix merely because the defaults differ

#### Scenario: A per-user installation has an npm symlink launcher
- **WHEN** A1 runs from `~/.local/lib/node_modules/@timurproko/a1`, active npm confirms `~/.local` as the inferred prefix, and `~/.local/bin/a1` is the symbolic link npm created to that package's `bin/cli.js`
- **THEN** A1 SHALL treat the installation as managed and update it in place with `--prefix ~/.local`
- **AND** a launcher symlink resolving to any other target SHALL leave the installation unmanaged

#### Scenario: Running package is not managed by global npm
- **WHEN** the running package path does not have npm's exact global package layout or active npm does not confirm the inferred root
- **THEN** A1 exits unsuccessfully and prints the manual npm installation command without modifying any package, launcher, release, or update transaction

#### Scenario: Running package is linked or checked out locally
- **WHEN** the running A1 package canonicalizes to a local checkout, npm link target, or another package-manager context
- **THEN** A1 exits unsuccessfully and prints the manual npm installation command without modifying any installation

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
- **THEN** A1 SHALL fail before registry, package, release, or runtime work

### Requirement: Update does not end a working session
The update subcommand SHALL complete while other A1 sessions are working, and SHALL NOT ask them
to stop or wait for them to finish. A session already running SHALL keep the release it started
on and SHALL be unaffected in its transcript, its terminal, and the agent turn in progress. The
release the update successfully installs and activates SHALL be what every subsequent ordinary
launch starts on, including when sessions on older retained releases remain live or concurrent launches observe
the activation handoff.

Where a running session cannot be preserved because it runs from the package being replaced, the
update SHALL say which session it is ending and why, before ending it.

#### Scenario: A session is working when an update runs
- **WHEN** the user updates in one terminal while an agent turn streams in another
- **THEN** the update SHALL install and report success
- **AND** the working session SHALL continue its turn, keep its transcript, and keep accepting
  input

#### Scenario: The next launch after an update
- **WHEN** a new session starts after an update, while an older session is still working
- **THEN** the new session SHALL start on the installed release without release-coordination diagnostics
- **AND** the older session SHALL remain on the release it started on

#### Scenario: Several launches overlap successful activation
- **WHEN** interactive launches overlap the successful activation of an installed release
- **THEN** each new invocation SHALL converge within a bounded interval on an eligible active release
- **AND** no invocation SHALL require closure of a retained session, machine restart, process discovery, or state deletion

#### Scenario: A session must be ended to replace the package
- **WHEN** the running session cannot be preserved because it runs from the package being replaced
- **THEN** the update SHALL report that it is ending that session and why before doing so

### Requirement: Model refresh command transcripts match pinned Pi
For equivalent profile contents and refresh results, `a1 update --models` and `a1 pi update --models` SHALL emit identical transcripts matching the repository's pinned Pi `update --models` command. Parity SHALL include wording, punctuation, line breaks, stdout/stderr destination, terminal-aware ANSI styling, and exit status. A1 SHALL NOT append its profile root, prepend product branding, or add an advisory to these summaries. A1 self-update and development-preview output SHALL remain outside this model-refresh contract.

#### Scenario: Model refresh succeeds
- **WHEN** either alias completes model-catalog refresh successfully
- **THEN** stdout SHALL contain exactly green `Model catalogs refreshed` followed by one newline, stderr SHALL be empty, and the exit status SHALL be zero
- **AND** there SHALL be no period, checkmark, product prefix, path suffix, or additional blank line

#### Scenario: Model refresh times out
- **WHEN** the refresh reaches its pinned timeout and reports an aborted result
- **THEN** stderr SHALL contain red `Error: Model catalog refresh timed out.` followed by one newline and the exit status SHALL be one
- **AND** stdout SHALL NOT contain a success summary

#### Scenario: Provider catalogs fail to refresh
- **WHEN** refresh returns one or more provider errors
- **THEN** stderr SHALL contain red `Error: Could not refresh model catalogs: <details>` followed by one newline, with each detail formatted as `<provider>: <message>` in pinned order and joined by `; `
- **AND** the command SHALL exit with status one without reporting success

#### Scenario: Model refresh throws another error
- **WHEN** model-runtime creation or refresh throws
- **THEN** the command SHALL use pinned Pi's `Error: <message>` formatting and `Unknown model catalog refresh error` fallback for a non-Error thrown value
- **AND** it SHALL preserve the displayed error message rather than whitespace-normalizing or truncating it independently

#### Scenario: Color is disabled or output is redirected
- **WHEN** both producers run with equivalent terminal and color-control settings
- **THEN** A1 SHALL follow pinned Pi's color-enablement behavior, including plain text without escape sequences when color is disabled
- **AND** changing color availability SHALL NOT change wording, streams, or newline count

#### Scenario: Refresh remains profile-local and non-interactive
- **WHEN** either model-refresh alias runs
- **THEN** it SHALL use only A1's selected profile and SHALL NOT update packages, update either executable, launch the UI, or start a background runtime

### Requirement: Successful update initiates bounded release cleanup
Before reporting a completed update, A1 SHALL durably commit the protected release set and a restart-safe cleanup disposition for obsolete releases. Potentially long physical deletion MAY continue after that commit, but the update SHALL start background maintenance that continues ordinary eligible work to completion without requiring another user command. Update and later maintenance entry points SHALL resume interrupted or temporarily blocked cleanup without requiring manual state or directory deletion, and SHALL retain bounded evidence of worker progress, continuation, and top-level failure.

#### Scenario: Update activates a new release
- **WHEN** the new release is certified and active
- **THEN** the update SHALL commit retention of the active, rollback, in-flight candidate, transaction-prior, and recently approved or materialized releases
- **AND** SHALL initiate collection of every other known release

#### Scenario: Historical append-only state exists
- **WHEN** the first cleanup-aware update reads a valid older release state whose retention list contains every previously activated release
- **THEN** A1 SHALL migrate it to the bounded protected set without deleting the active, rollback, or a recently approved release

#### Scenario: Physical deletion is slow
- **WHEN** removing an obsolete release tree would materially delay return to the invoking shell
- **THEN** A1 SHALL preserve the committed cleanup disposition and continue deletion through bounded background maintenance rather than retaining the release indefinitely

#### Scenario: Backlog exceeds one maintenance allowance
- **WHEN** a successful update leaves more eligible obsolete content than one bounded maintenance batch can process
- **THEN** background maintenance SHALL continue or arrange its own continuation until the eligible backlog is drained without requiring another launch or update

#### Scenario: Preparation consumes the batch allowance
- **WHEN** discovery, ownership checks, or durable state preparation consume the nominal duration of a non-empty maintenance batch
- **THEN** the background worker SHALL still attempt eligible cleanup work and SHALL NOT repeatedly exit with zero progress

#### Scenario: Cleanup cannot delete one release
- **WHEN** an obsolete contained release cannot be moved or deleted because of a transient filesystem failure
- **THEN** the successful activation SHALL remain authoritative, A1 SHALL retain actionable cleanup diagnostics, other eligible items SHALL remain able to progress, and bounded maintenance SHALL retry safely

#### Scenario: Detached worker fails unexpectedly
- **WHEN** a scheduled cleanup worker exits before recording successful completion
- **THEN** A1 SHALL retain every incomplete disposition, record bounded worker failure or incomplete-run evidence, and resume safely through its continuation or the next maintenance entry point

### Requirement: Private runtime execution uses one supported launch contract
Launch, warmup, update activation, retained-release execution, rollback, and recovery SHALL use the single current neutral private environment contract. Pre-cutover runtimes, updaters, rollback targets, and recovery capsules are outside this contract. The implementation SHALL NOT supply legacy private aliases, translate obsolete private input, negotiate an older encoding, rewrite historical runtime payloads, or provide migration helpers to make those components executable.

Runtime-target eligibility SHALL be established from verified target metadata before execution or activation; a missing or different private-contract identity SHALL make a target ineligible. Package-version ordering alone SHALL NOT establish eligibility. An unsupported retained or recovery target SHALL NOT be silently executed as a fallback. When no safe current-contract selection is available, the operation SHALL stop with an actionable diagnostic rather than changing encoding or deleting state.

#### Scenario: A current-contract target is activated
- **WHEN** a verified installed candidate uses the current private contract
- **THEN** its warmup and launch SHALL receive the required neutral launch context and satisfy the existing readiness and verification requirements

#### Scenario: A pre-cutover retained target is selected
- **WHEN** a launch candidate lacks the current private-contract identity
- **THEN** that target SHALL be rejected before its entry point is executed or its activation is committed
- **AND** the implementation SHALL NOT select a legacy key writer to make it launchable

#### Scenario: An old active reference blocks launch
- **WHEN** stale runtime references prevent a safe current-contract launch selection
- **THEN** launch SHALL report the unsupported state and required cutover action without executing or automatically migrating the old runtime

#### Scenario: No supported rollback target exists
- **WHEN** activation fails and all available rollback candidates are outside the current private contract
- **THEN** rollback SHALL report that no eligible target is available
- **AND** it SHALL NOT execute a pre-cutover target or silently declare rollback successful

### Requirement: The initial private-contract cutover protects user data
The first installation adopting the neutral private contract SHALL be a deliberate clean cutover, not a supported old-to-new self-update or migration path. Its handoff SHALL instruct the maintainer to stop existing application and worker processes and install the accepted new package directly through npm. It SHALL NOT rely on an old `a1 update` command or old recovery launcher completing the cutover.

Any required reset SHALL be restricted to individually identified disposable runtime/release state after affected processes stop. The handoff SHALL identify exact resolved paths and their purpose and require separate explicit confirmation before removal. The application SHALL NOT automatically delete or convert existing state to resolve an unsupported contract. Whole configuration/data-root deletion SHALL NOT be used as a shortcut when user and disposable data coexist.

The public command, package identity, supported user-facing environment settings, user-directory resolution, settings, credentials, session data, prompt history, and `.a1` user data SHALL remain unchanged by this cutover. No user-data relocation or format migration is authorized. Returning to a pre-cutover build is a separate deliberate manual installation/reset, not a supported in-application rollback route.

#### Scenario: The maintainer installs the first new-contract build
- **WHEN** installation instructions are delivered for the initial cutover
- **THEN** they SHALL name the accepted package version, direct npm installation command, and stop-process prerequisite
- **AND** they SHALL distinguish this one-time path from subsequent supported `a1 update` operations

#### Scenario: Disposable-state reset is necessary
- **WHEN** unsupported runtime/release records must be reset before the new installation can run
- **THEN** the exact disposable paths and their purpose SHALL be presented for separate confirmation
- **AND** no application-driven migration or automatic deletion SHALL occur

#### Scenario: Disposable and user data share a root
- **WHEN** a reset candidate is located beneath a root that also stores settings, sessions, or history
- **THEN** the reset SHALL exclude those user-data paths and SHALL NOT remove the whole root

#### Scenario: Old recovery state is encountered
- **WHEN** a pre-cutover recovery capsule would otherwise resume package replacement or launch an old runtime
- **THEN** the new implementation SHALL reject that recovery path and provide the manual cutover guidance
- **AND** it SHALL NOT translate the capsule or activate an obsolete runtime

### Requirement: Current-contract lifecycle behavior retains its safety guarantees
After the clean cutover, different release versions using the same private contract SHALL support normal launch, comparison launch, update activation, retained-session continuity, rollback, and interrupted-update recovery under the existing lifecycle rules. The naming refactor SHALL NOT weaken immutable-root verification, content certification, ownership checks, public-setting validation, or existing startup/update budgets.

Owned outgoing context SHALL be reconstructed from the verified selected target and current launch intent rather than stale inherited private values. Required fields SHALL form a coherent current context, and invalid or missing fields SHALL fail before use without falling back to another release or default path. Platform-specific casing SHALL NOT permit ambiguous duplicate private keys. Diagnostics SHALL identify the logical setting without dumping unrelated environment values.

Acceptance SHALL include executable tests for current-contract lifecycle operations, rejection of obsolete-only private input and unsupported targets, and preservation of protected user data. Successful pre-cutover interoperability tests are not required and SHALL NOT be replaced with compatibility behavior merely to make historical fixtures pass.

#### Scenario: A supported session remains active during update
- **WHEN** an update installs another release using the current private contract while a retained session on that contract is working
- **THEN** the session SHALL retain its release, transcript, and input
- **AND** subsequent launches SHALL select the appropriate installed release

#### Scenario: Rollback or recovery uses the current contract
- **WHEN** rollback selects a verified current-contract release or interrupted replacement resumes through current-contract recovery state
- **THEN** the operation SHALL retain its existing verification, readiness, and launcher-availability guarantees

#### Scenario: A new-contract launch inherits stale private values
- **WHEN** a launcher selects a verified target while inheriting context from another session
- **THEN** it SHALL reconstruct the owned outgoing context from the selected target and current intent
- **AND** unrelated public and third-party settings SHALL remain unchanged

#### Scenario: Required current context is absent or ambiguous
- **WHEN** a private entry lacks required neutral fields or receives conflicting case-equivalent private keys
- **THEN** it SHALL fail validation before using that context
- **AND** obsolete branded keys SHALL NOT satisfy the missing fields

#### Scenario: Acceptance is reviewed
- **WHEN** the clean-cutover implementation is proposed for acceptance
- **THEN** evidence SHALL cover current-contract packaged launch/update/rollback/recovery, unsupported-input and target rejection, protected user-data sentinels, public overrides, supported platforms, and unchanged budgets

### Requirement: Update progress uses the shared semantic accent
When A1 shows self-update progress in a color-capable terminal, the completed segment SHALL use the active global A1 profile's selected semantic Accent color, or the blue default if no valid choice can be read. Self-update and fresh installation SHALL consume byte-equivalent release-owned forms of the same named A1 palette contract, and palette synchronization SHALL regenerate and validate them when the named A1 palette changes. The remaining segment SHALL retain its muted track color, and the percentage text SHALL retain its existing neutral treatment. Resolving the color SHALL NOT require starting an interactive agent, background runtime, or project resource pipeline.

The color source change SHALL NOT alter the progress bar's glyphs, width, percentage calculation, monotonic movement, or cleanup behavior.

#### Scenario: An update is in progress
- **WHEN** A1 renders a partially completed self-update progress bar for a profile with a saved accent
- **THEN** the completed segment SHALL render with that profile's selected semantic accent
- **AND** the remaining segment SHALL render in its muted track color
- **AND** the visible bar geometry and percentage SHALL remain unchanged

#### Scenario: Progress reaches either boundary
- **WHEN** A1 renders zero or complete self-update progress
- **THEN** it SHALL preserve the same selected-accent and muted-track contract for every segment that is present
- **AND** it SHALL reset terminal foreground styling after the percentage text

#### Scenario: No valid preference is available
- **WHEN** a self-update runs without a readable valid accent in the effective global profile
- **THEN** the completed segment SHALL use the shared blue default without failing the update

#### Scenario: The pinned Pi accent changes
- **WHEN** a Pi pin upgrade changes the named A1 palette projection or a named A1 palette entry changes
- **THEN** synchronization SHALL regenerate the shared progress palette from that owned presentation
- **AND** conformance SHALL fail if either progress renderer or either committed generated palette form remains on an older color

### Requirement: The installed release activates itself
An update is performed by the release that is already installed against a tree newer than it, so the updater SHALL NOT assume the layout of the tree it has just installed. The package manifest SHALL declare the activation contracts the tree serves in `updateActivationContracts`, and a tree serving `activate-v1` SHALL ship `bin/activate.js`. After the global installation succeeds, an updater that finds a contract it serves SHALL start that entry with the data directory and the target version and SHALL relay the entry's line-delimited progress events (`materializing`, `phase`, `warmup`, `completed`, `failed`) into its own transaction journal and progress display; the entry SHALL activate the tree it ships in with that tree's own release code. The updater SHALL resolve no path inside the installed tree other than `package.json` and the declared entry.

A tree that declares no contract the updater serves SHALL be activated in-process with the layout that tree had, so an updater older than the contract and an installation of an older preview both remain supported. A delegated activation SHALL succeed only when the entry exits successfully after reporting `completed`; a `failed` event, an unsuccessful exit, an exit without a verdict, or an event the updater cannot interpret SHALL fail the update with the entry's own bounded reason under the existing rollback rules. The entry's stderr SHALL be captured and bounded, never shared with the terminal.

#### Scenario: The installed tree serves the contract
- **WHEN** the newly installed manifest lists `activate-v1` and the updater serves it
- **THEN** the updater starts the tree's `bin/activate.js` and advances its journal phases and progress display from the events that entry reports
- **AND** the updater runs none of the materialization, certification, or warmup steps itself

#### Scenario: The installed tree predates the contract
- **WHEN** the newly installed manifest declares no `updateActivationContracts`, or only contracts the updater does not serve
- **THEN** the updater activates the tree in-process exactly as it did before the contract existed

#### Scenario: The tree's own activation fails
- **WHEN** the entry reports `failed`, exits unsuccessfully, or exits without reporting `completed`
- **THEN** the update fails with the entry's own reason or its exit status and bounded stderr, and the prior release is restored under the existing rollback rules

#### Scenario: The tree changes its own layout
- **WHEN** a later release renames or removes an entry its activation uses
- **THEN** every installed updater that serves the contract still activates it, because the layout is read only by the tree's own entry

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

### Requirement: Update is isolated from the interactive runtime
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Update runs apart from interactive sessions".
