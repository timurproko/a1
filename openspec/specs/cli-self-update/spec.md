# cli-self-update Specification

## Purpose

Defines a safe, discoverable CLI workflow for replacing a globally installed A1 release with the latest release published through its authoritative npm package.

## Requirements

### Requirement: Update uses the authoritative npm release
The self-update workflow SHALL resolve the `latest` release of `@timurproko/a1` from the configured npm registry and SHALL globally install it only when it is newer than the running release. A1 MUST use cross-platform process execution with fixed argument arrays and MUST NOT construct an interpolated shell command string.

#### Scenario: A newer release is available
- **WHEN** npm reports a latest `@timurproko/a1` version newer than the running version
- **THEN** A1 SHALL globally install the resolved `@timurproko/a1` release and report the running and target versions

#### Scenario: The installed release is current
- **WHEN** npm reports a latest `@timurproko/a1` version that is equal to or older than the running version
- **THEN** A1 SHALL report that it is already current and exit successfully without reinstalling

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

### Requirement: Immutable release preparation avoids redundant payload passes
For a newly installed target, A1 SHALL derive release identity while writing the immutable candidate in one bounded payload pass and SHALL certify the atomically committed candidate from process-local proof produced by that pass. It MUST NOT perform a second complete destination-content read solely to certify bytes that the same uninterrupted materialization operation just hashed and wrote. An existing release lacking valid trusted certification SHALL still receive complete verification before selection.

#### Scenario: A new target is materialized
- **WHEN** no exact immutable target release exists
- **THEN** each source payload byte SHALL be read for hashing and candidate writing in one streaming pass, followed by metadata durability and atomic commit without a complete post-copy content re-read

#### Scenario: Materialization is interrupted
- **WHEN** the process exits before atomic candidate commit and certification
- **THEN** no partial candidate SHALL become selectable or gain trusted certification

#### Scenario: An exact certified release already exists
- **WHEN** durable state and the immutable manifest select an already certified exact release
- **THEN** A1 SHALL reuse it without recopying the package payload

#### Scenario: Existing release trust is incomplete
- **WHEN** an existing release has no valid certification binding its identity and content digest
- **THEN** A1 SHALL verify its complete content before approval or activation

### Requirement: Update failures are actionable
A1 SHALL surface relevant npm diagnostics and exit unsuccessfully when registry lookup, npm startup, permission acquisition, or global installation fails. It MUST NOT report a successful update unless npm completed the requested global installation successfully. The diagnostics of a failed child SHALL be the bounded text that child itself wrote, printed once immediately before the line that names the failed action, so the reason precedes the verdict.

#### Scenario: npm is unavailable
- **WHEN** the platform npm executable cannot be started
- **THEN** A1 reports that npm could not be executed and exits unsuccessfully

#### Scenario: Global installation is rejected
- **WHEN** npm rejects installation because of permissions, network access, registry policy, or package validation
- **THEN** A1 preserves npm diagnostics, reports that the update failed, and exits with an unsuccessful status

#### Scenario: A failed step wrote nothing
- **WHEN** a child of the update exits unsuccessfully without writing any text
- **THEN** A1 reports the failed action and status without referring the user to diagnostics that do not exist

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

### Requirement: Update progress follows the work
When A1 shows update progress, the display SHALL advance with the work being done
rather than only at the boundaries between steps. The step that copies the
installed package into an immutable release SHALL report the files it has written
against the files it must write, and that report SHALL drive the display across a
span reserved for it.

Where a step cannot report its own progress, the display MAY approach the next
milestone without reaching it, but SHALL NOT come to rest on a value that renders
as that milestone — otherwise arriving at the milestone changes nothing on screen
and a working update is indistinguishable from a hung one.

Progress SHALL never move backwards, and SHALL end at completion.

#### Scenario: The release is copied
- **WHEN** the update copies the installed package into an immutable release
- **THEN** the display SHALL advance repeatedly across the span reserved for copying as files are written
- **AND** SHALL NOT cross that span in a single step

#### Scenario: A step cannot report progress
- **WHEN** a step such as the global npm installation runs without reporting progress
- **THEN** the display SHALL keep moving toward the next milestone
- **AND** SHALL remain below the value that milestone will show

#### Scenario: The update completes
- **WHEN** the update finishes successfully
- **THEN** the display SHALL show completion, and every value it showed SHALL have been non-decreasing

### Requirement: Progress reports no detail beyond the bar
The file being copied, the number of files, and the count completed SHALL reach
the terminal only as the position of the update's single-line progress display.
A1 SHALL NOT print file names, counts, or per-file lines during an update, and
launch SHALL report nothing about activation at all.

No child process the update starts SHALL share the terminal: the update SHALL
capture what a child writes, keep a bounded tail of it, and show it only with
the failure it explains. A child that exits successfully SHALL leave nothing on
the terminal regardless of what it wrote. A helper entry that an older
installed updater still runs from the newly installed tree SHALL exit
successfully and silently, so that a step the newer tree no longer needs never
appears as a failure.

#### Scenario: An update is watched
- **WHEN** an update copies thousands of files
- **THEN** the terminal SHALL show one progress line and no per-file output

#### Scenario: A launch activates a release
- **WHEN** bare A1 launches and activates a materialized release
- **THEN** nothing about that activation SHALL be written to the terminal

#### Scenario: A child succeeds with warnings
- **WHEN** npm or another child of the update exits successfully after writing a notice or warning to its stderr
- **THEN** the terminal SHALL show the progress bar and the success line only

#### Scenario: An older updater runs a retired helper entry
- **WHEN** an installed updater older than 0.1.8-dev.479 runs `bin/sync-pi-tui-proxy.js` of the tree it has just installed
- **THEN** that entry SHALL exit with status 0 and write nothing, and the older updater SHALL print no diagnostic for it

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

### Requirement: A preview can be installed by name
The value after `--develop` SHALL say which preview to move to. A positive decimal
SHALL name a preview by its pull request number, and a full version SHALL name it
outright. A preview records its merged pull request in its published manifest, so the
pull request number alone SHALL be enough to identify one, and the version in front
of it SHALL NOT have to be supplied. A preview published before pull requests were
recorded carries the number as the trailing identifier of its `<version>-dev.<pr>`
version, and the pull request number SHALL still identify it.

The named preview SHALL be resolved against the versions and manifests the registry
actually published rather than constructed from the name. A name matching nothing
SHALL be refused and named in the refusal; a name matching more than one published
version SHALL be refused rather than resolved to a guess. Nothing SHALL be installed
in either case.

What may be named there is a preview. A published release named there SHALL be
refused, SHALL be told apart from a preview in the refusal, and SHALL point at the
command that moves to the current release — installing a release through the
preview path would record it as something it is not.

An empty or unusable name SHALL be refused before anything is asked of the
registry.

#### Scenario: A commit is named
- **WHEN** the user runs `a1 update --develop <pr>` for a pull request that a published preview records in its manifest
- **THEN** A1 SHALL install that preview, whatever version it carries

#### Scenario: An older preview is named
- **WHEN** the user runs `a1 update --develop <pr>` and no published manifest records that pull request but exactly one published preview ends in `-dev.<pr>`
- **THEN** A1 SHALL install that preview

#### Scenario: A full version is named
- **WHEN** the user runs `a1 update --develop <version>` for a published preview version
- **THEN** A1 SHALL install that version

#### Scenario: A release is named
- **WHEN** the user names a published release rather than a preview
- **THEN** A1 SHALL refuse, say that it is a release, point at the release command, and install nothing

#### Scenario: The name matches nothing
- **WHEN** the named pull request or version was never published
- **THEN** A1 SHALL refuse, name what it could not find, and install nothing

#### Scenario: The name matches more than one version
- **WHEN** a pull request number is recorded by, or trails, more than one published version
- **THEN** A1 SHALL refuse, list what it found, and ask for a version instead

#### Scenario: The newest preview is wanted
- **WHEN** the user runs `a1 update --develop` with no value
- **THEN** A1 SHALL install whatever the preview channel currently points at, subject to the channel-head downgrade rule

### Requirement: Development preview selectors are strict
A value after `--develop` SHALL be either a positive decimal or an exact semantic
version matching `<major>.<minor>.<patch>-dev.<positive-decimal>`. A stable version,
zero, source hash, unknown flag, second value, or missing value for another option
SHALL fail before registry discovery or installation.

#### Scenario: Zero is selected
- **WHEN** the user runs `a1 update --develop 0`
- **THEN** A1 SHALL fail without registry or installation work

#### Scenario: Stable version is selected
- **WHEN** the user runs `a1 update --develop 0.1.8`
- **THEN** A1 SHALL fail without registry or installation work

#### Scenario: Extra selector is supplied
- **WHEN** the user runs `a1 update --develop 107 108`
- **THEN** A1 SHALL fail without registry or installation work

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

### Requirement: Abandoned release artifacts are reconciled
A1 SHALL eventually remove abandoned candidate directories, managed trash, and certification evidence that no protected release or active transaction references. Reconciliation SHALL remain bounded during interactive launch and SHALL not delete profile settings, credentials, sessions, extensions, skills, prompts, themes, or unrelated files.

#### Scenario: Update was interrupted before candidate commit
- **WHEN** a private candidate directory remains from an update process that is no longer live and no active transaction can commit it
- **THEN** bounded cleanup SHALL remove that candidate

#### Scenario: Old certification evidence remains
- **WHEN** its release record and immutable root have been safely detached and no protected reference names the release
- **THEN** A1 SHALL remove the corresponding obsolete certification evidence

#### Scenario: Legacy Windows path casing differs
- **WHEN** valid legacy state spells the managed Windows data directory with different letter casing from the current canonical path
- **THEN** A1 SHALL recognize the same managed identity, remove only the canonical obsolete evidence, and SHALL NOT authorize deletion outside the managed data directory

#### Scenario: Interactive launch encounters a large backlog
- **WHEN** launch discovers more obsolete content than its bounded scheduling allowance can remove
- **THEN** launch SHALL continue toward the interactive UI and SHALL start or signal background maintenance with enough durable cleanup state to finish

#### Scenario: Several artifact classes remain
- **WHEN** detached releases, managed trash, stale candidates, obsolete certifications, dependency artifacts, or caches are simultaneously eligible
- **THEN** bounded maintenance SHALL make fair progress without allowing one repeatedly failing identity or artifact class to starve the others

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

### Requirement: Global package replacement is cancellation safe
Before allowing npm to mutate the globally managed A1 package or its launchers, the self-update workflow SHALL durably prepare verified recovery evidence and delegate the destructive replacement interval to an independently surviving owner. An ordinary cancellation request SHALL be recorded and coordinated at a safe boundary rather than delivered as an uncontrolled termination of npm. Every success, failure, or acknowledged-cancellation result SHALL satisfy a launcher postcondition proving that the platform's complete public launcher set resolves to a verified recovery release or a completely installed target.

#### Scenario: Cancellation precedes package mutation
- **WHEN** cancellation is requested before npm begins changing the global package
- **THEN** A1 SHALL stop without starting package replacement and SHALL leave the existing launchers and active release unchanged

#### Scenario: Cancellation occurs inside the destructive interval
- **WHEN** cancellation is requested after npm may have renamed the package or any launcher
- **THEN** A1 SHALL stop or finish npm only through the recovery owner, restore or verify the complete launcher set, durably record the safe disposition, and only then acknowledge cancellation

#### Scenario: Updater exits while replacement continues
- **WHEN** the invoking updater exits after handing package replacement to the recovery owner
- **THEN** the recovery owner SHALL remain able to finish or contain npm and SHALL establish the launcher postcondition independently of the updater

#### Scenario: npm replacement fails
- **WHEN** npm exits unsuccessfully after changing the package root or launchers
- **THEN** the recovery owner SHALL preserve npm diagnostics, restore a verified callable launcher, and retain a transaction that the next invocation can safely continue or roll back

#### Scenario: Target installation completes after cancellation
- **WHEN** npm has completely installed and verified the selected target before coordinated cancellation reaches its safe boundary
- **THEN** A1 MAY retain the installed target launchers while leaving activation to the durable transaction recovery path

### Requirement: Recovery evidence is narrow, durable, and disposable
Update recovery evidence SHALL bind one transaction identity, canonical npm global root, package root, complete launcher path set, prior verified release identity, target version, recovery payload digest, npm executable, and installation arguments. For a newly created transaction, those arguments SHALL explicitly pin the npm prefix derived from the bound global root. Before visible progress, ownership release, package-unlock mutation, transaction creation, recovery-owner startup, or package replacement, A1 SHALL resolve npm's JavaScript entry from validated npm execution context, the active npm global root, or the current Node installation's bounded bundled-npm layout and SHALL bind only its canonical regular-file target. Capsule preparation SHALL revalidate the preflight identity when committing recovery authority. Direct invocation SHALL NOT require npm's lifecycle-only `npm_execpath`, and npm's acquisition location MAY differ from the confirmed package destination prefix without granting authority over another destination.

When preflight cannot establish replacement authority, A1 SHALL leave ownership, package files, launchers, active release, and transaction state unchanged, SHALL emit no update progress frame, and SHALL provide the preferred official installer bridge as the bounded recovery action. Recovery evidence SHALL be committed before destructive replacement, consumed only within those bounds, and removed after the transaction and launcher disposition are complete. The recovery mechanism SHALL NOT add another public A1 command, trust arbitrary npm temporary paths or prefixes, or weaken immutable release validation. A valid recovery capsule created before explicit-prefix binding SHALL remain readable only with its exact legacy unprefixed installation arguments and all other existing authority checks intact.

#### Scenario: Recovery capsule is prepared
- **WHEN** A1 is ready to begin global package replacement
- **THEN** it SHALL have already validated the canonical npm entry without mutating update lifecycle state
- **AND** it SHALL commit the bounded recovery payload and identity before npm can remove a public launcher
- **AND** the recorded npm arguments SHALL select the exact package target and prefix bound by the capsule

#### Scenario: Direct Windows invocation uses Node-bundled npm
- **WHEN** A1 is invoked directly without `npm_execpath`, active npm reports a user-scoped global package root, and the selected npm/current Node installation supplies a canonical regular `node_modules/npm/bin/npm-cli.js` outside that root
- **THEN** A1 SHALL preflight and bind that JavaScript entry into recovery evidence
- **AND** package replacement SHALL remain pinned to the independently confirmed user-scoped package prefix and launcher set

#### Scenario: No valid npm JavaScript entry exists
- **WHEN** every bounded npm-entry candidate is absent, non-regular, or cannot be canonicalized
- **THEN** A1 SHALL fail before progress, ownership shutdown, transaction creation, recovery-owner startup, or package replacement
- **AND** SHALL NOT accept an arbitrary shell wrapper, directory, prefix, or searched npm path as replacement authority
- **AND** SHALL identify the official installer bridge without claiming rollback was needed

#### Scenario: Non-default-prefix replacement is interrupted
- **WHEN** replacement of a confirmed non-default-prefix installation is canceled or the invoking updater exits
- **THEN** the recovery owner SHALL resume or restore only the package root and complete launcher set under that confirmed prefix
- **AND** SHALL NOT mutate the active default prefix

#### Scenario: Concurrent or stale recovery owner appears
- **WHEN** another worker or a later invocation observes recovery evidence for the same transaction
- **THEN** A1 SHALL use verified process identity and durable disposition to converge on one recovery owner without racing launcher writes

#### Scenario: Existing valid recovery evidence predates explicit prefix arguments
- **WHEN** A1 reads a valid in-flight capsule containing the exact previously supported unprefixed npm installation arguments
- **THEN** it SHALL retain the capsule's existing canonical-root, package, launcher, target, executable, and digest checks and MAY resume it
- **AND** SHALL NOT accept any other unpinned or arbitrary argument form

#### Scenario: Recovery completes
- **WHEN** the package transaction and launcher postcondition are durably complete
- **THEN** A1 SHALL retire the recovery worker and make its transaction-scoped capsule eligible for bounded cleanup

### Requirement: Update materializes a validated minimal runtime payload
The immutable payload selected by update SHALL contain every executable module, package manifest, native binary, and runtime asset required by supported A1 commands and profiles, and SHALL omit files classified as development-only only when generated payload evidence and exact-package validation prove they are not runtime inputs.

#### Scenario: Development-only package content is present
- **WHEN** installed dependencies contain declarations, source maps, source trees, examples, tests, or documentation that no supported runtime path reads
- **THEN** immutable materialization SHALL exclude those files from executable release and dependency-layer payloads

#### Scenario: Runtime loads a non-code asset
- **WHEN** a supported command loads a theme, template, provider catalog, native module, WebAssembly module, license-required resource, or other declared asset
- **THEN** generated payload evidence SHALL include that file and exact-package validation SHALL fail if it is absent or changed

#### Scenario: Runtime payload classification is uncertain
- **WHEN** A1 cannot prove that an installed file is development-only
- **THEN** materialization SHALL retain it rather than risk a delayed runtime failure

### Requirement: Update reuses unchanged certified runtime content
When an installed target selects runtime dependency content identical to an existing certified layer, update SHALL reuse that layer without writing another complete copy. Update evidence SHALL distinguish source discovery, reused files and bytes, newly written files and bytes, and verification reads.

#### Scenario: Preview changes only product code
- **WHEN** consecutive exact previews select the same dependency-layer identity
- **THEN** update SHALL write only release-specific product content and metadata and SHALL leave the shared layer path unchanged

#### Scenario: Existing layer trust is incomplete
- **WHEN** matching layer files exist without valid certification bound to their complete runtime identity
- **THEN** A1 SHALL verify or rematerialize them before reuse

### Requirement: Post-activation warmup is bounded and side-effect free
Where required to satisfy first-launch performance, update SHALL warm the common immutable startup graph before reporting success. Warmup SHALL be represented as update progress, SHALL finish within a declared bound, and SHALL NOT attach a terminal, create or mutate a session, prompt for project trust, execute an extension, load project-local executable resources, mutate profile settings, or perform network access.

#### Scenario: Newly activated content is cold
- **WHEN** startup evidence requires warmup for the next launch to meet its budget
- **THEN** update SHALL complete the isolated warmup against the exact active release before reporting success

#### Scenario: Warmup detects an unusable release
- **WHEN** the exact active startup graph cannot be imported or validated without forbidden side effects
- **THEN** update SHALL fail safely with bounded diagnostics and retain or restore a verified rollback release

#### Scenario: Warmup is unnecessary
- **WHEN** measured exact-package evidence proves the next launch budget without warmup
- **THEN** update MAY omit the warmup phase

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

### Requirement: Post-activation warmup targets the exact interactive startup artifact
When update performs post-activation warmup, it SHALL load the same immutable startup artifact, public dependency surfaces, and compile-cache namespace that the next interactive launch will use. Warmup SHALL fail safely when those identities differ and SHALL retain its existing terminal-free, session-free, trust-free, extension-free, and network-free behavior.

#### Scenario: Optimized release is activated
- **WHEN** update activates a release whose interactive path uses narrowed modules or a generated startup artifact
- **THEN** warmup SHALL load that exact artifact and its immutable dependency identities before reporting update success

#### Scenario: Warmup and launch identities differ
- **WHEN** the warmup entry, generated startup artifact, dependency bindings, or compile-cache namespace does not match the activated interactive path
- **THEN** update SHALL reject the candidate or use safe rollback handling rather than report a warmed successful release

#### Scenario: Optional feature is excluded from eager startup
- **WHEN** an optional feature is intentionally deferred beyond first input-ready render
- **THEN** warmup SHALL NOT load or execute that feature merely to populate a broader cache

### Requirement: The installed release activates itself
An update is performed by the release that is already installed against a tree newer than it, so the updater SHALL NOT assume the layout of the tree it has just installed. The package manifest SHALL declare the activation contracts the tree serves in `updateActivationContracts`, and a tree serving `activate-v1` SHALL ship `bin/activate.js`. After the global installation succeeds, an updater that finds a contract it serves SHALL start that entry with the data directory and the target version and SHALL relay the entry's line-delimited progress events (`materializing`, `phase`, `warmup`, `completed`, `failed`) into its own transaction journal and progress display; the entry SHALL activate the tree it ships in with that tree's own release code. The updater SHALL resolve no path inside the installed tree other than `package.json` and the declared entry.

A tree that declares no contract the updater serves SHALL be activated in-process with the layout that tree had, so an updater older than the contract and an installation of an older preview both remain supported. A delegated activation SHALL succeed only when the entry exits successfully after reporting `completed`; a `failed` event, an unsuccessful exit, an exit without a verdict, a malformed line, or a malformed known event SHALL fail the update with the entry's own bounded reason under the existing rollback rules, except that a failure after the active reference is committed SHALL be settled as a completed update. A well-formed event of an unknown kind SHALL be ignored. The entry's stderr SHALL be captured and bounded, never shared with the terminal.

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

### Requirement: Package release is verified with bounded patience
After ownership of the installed package has been released, A1 SHALL verify that nothing still holds the package tree before replacing it, and SHALL keep re-checking for a bounded window of fifteen seconds when the check is refused because the tree is held, pausing longer between checks up to a one-second cap. A refusal that does not indicate a held tree SHALL fail at once. When the window closes with the tree still held, A1 SHALL fail without having changed the installation and SHALL name the package path, the kinds of program that hold a tree, and that the update can be run again. A check that moved the tree SHALL put it back under its own name with the same patience, and SHALL name where the tree is if that cannot be done.

#### Scenario: The package is briefly held after a session ends
- **WHEN** the update checks the package tree while a scanner, an indexer, a file browser, or a session still finishing its exit holds a file under it, and the holder lets go within the window
- **THEN** the update SHALL proceed and install the target release
- **AND** SHALL NOT report the hold

#### Scenario: The package stays held
- **WHEN** the package tree remains held for the whole window
- **THEN** the update SHALL fail and roll back without modifying the installation
- **AND** SHALL report how long it waited, the package path, the kinds of program that hold a tree, and that nothing was changed and the update can be run again

#### Scenario: The check fails for a reason other than a hold
- **WHEN** the check is refused with an error that does not indicate a held tree
- **THEN** the update SHALL fail at once without waiting
- **AND** SHALL report that the package could not be verified rather than that it is locked

#### Scenario: The tree is held while it wears the check's name
- **WHEN** the check has moved the tree and a holder appears before it is moved back
- **THEN** the update SHALL keep trying to restore it for the remainder of the window
- **AND** if the tree cannot be restored SHALL name both where it is and where it belongs

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

### Requirement: Published releases are reachable through predecessor-owned update behavior
A release SHALL NOT be considered self-update compatible solely because updater code inside that target works after installation. Exact-package release evidence SHALL drive the supported published predecessor's own protected replacement behavior through package and launcher mutation, recovery postconditions, and target activation. The ordinary immediate predecessor SHALL complete direct update without npm lifecycle-only environment variables in every supported installation layout. If an already-published predecessor is known to lack required acquisition context, the preferred official installer MAY provide a bounded bridge only by supplying canonical npm execution context to that predecessor's existing protected updater; this exception SHALL be explicit and SHALL NOT be described as retroactive direct-update success.

A target-side fix that cannot be reached from the source release SHALL block release readiness until an accepted protected bridge is proven. Candidate-only recovery tests and post-install materialization/warmup tests SHALL remain necessary evidence but SHALL NOT substitute for predecessor-to-target replacement.

#### Scenario: Immediate predecessor installs the candidate
- **WHEN** release validation exercises the newest supported published predecessor against the exact candidate
- **THEN** that predecessor's own updater SHALL prepare recovery, replace the package, establish a complete launcher postcondition, and activate the candidate
- **AND** the resulting command SHALL be callable from the same verified installation prefix

#### Scenario: Candidate contains an updater fix
- **WHEN** the defect being fixed occurs before the target package can be installed
- **THEN** validation SHALL require source-release or protected-bridge evidence that reaches the candidate
- **AND** candidate updater success alone SHALL NOT establish that the fix is deliverable

#### Scenario: A known immutable predecessor needs the installer bridge
- **WHEN** a valid already-published predecessor cannot establish npm replacement authority during direct invocation but accepts a canonical npm execution context
- **THEN** the official installer MAY delegate to that predecessor with the validated context
- **AND** the predecessor SHALL retain ownership of transaction, cancellation, replacement, launcher recovery, activation, and rollback
- **AND** evidence SHALL distinguish this bridge from ordinary direct update

#### Scenario: Neither direct update nor protected bridge succeeds
- **WHEN** the supported predecessor cannot reach the exact candidate through either required path
- **THEN** publication SHALL fail rather than ship an update that affected users cannot install

### Requirement: Explicit update commands remain available

A1 SHALL retain `a1 update`, `a1 update --release`, `a1 update --develop`, and named development preview forms as explicit noninteractive update commands. Automatic startup update SHALL NOT remove, rename, redirect, or weaken those commands. Explicit commands SHALL continue to print progress and actionable failure diagnostics. `--release` and `--develop` SHALL remain the supported routes for deliberate channel changes; named previews remain the route for specific preview selection, immediate retry, and troubleshooting.

#### Scenario: User requests the stable channel explicitly
- **WHEN** the user runs `a1 update --release`
- **THEN** A1 SHALL execute the existing visible stable update workflow subject to the shared execution lease

#### Scenario: User requests a named preview
- **WHEN** the user runs `a1 update --develop 107` or names a full published preview version
- **THEN** A1 SHALL preserve the existing exact preview resolution and installation behavior

### Requirement: An explicit update invalidates the release-check cache
When an explicit `a1 update` or `a1 update --develop` completes successfully, A1 SHALL remove the user-level release-check cache so that the next interactive launch queries the registry's current channel head instead of comparing the newly installed version against a result recorded before the update. A failed, refused, or already-current explicit update SHALL leave the cache unchanged.

#### Scenario: A named preview is installed below a cached head
- **WHEN** the cache records `0.2.7-dev.835` as the development head and the user installs `0.2.7-dev.828` by name while the registry's `next` tag is `0.2.7-dev.828`
- **THEN** the next interactive launch SHALL query the registry, find no newer release, and start no automatic update

#### Scenario: The update is refused
- **WHEN** an explicit update reports that A1 is already current or fails before replacing the package
- **THEN** the release-check cache SHALL be left as it was

### Requirement: Self-update progress uses compact shared geometry
When A1 renders interactive self-update progress, the visible bar segment before the percentage SHALL occupy exactly 38 terminal cells. Fresh installation SHALL use the same bar width, glyphs, percentage suffix, and proportional fill geometry. The shorter geometry SHALL NOT change progress calculation, milestone movement, color roles, or terminal cleanup.

#### Scenario: A partial update is displayed
- **WHEN** A1 renders a two-digit percentage during self-update
- **THEN** the completed and remaining bar segments together SHALL occupy exactly 38 terminal cells
- **AND** one space and the numeric percentage SHALL follow the bar

#### Scenario: Progress reaches either boundary
- **WHEN** self-update renders zero or complete progress
- **THEN** the bar SHALL remain exactly 38 terminal cells wide
- **AND** its completed segment SHALL represent the bounded percentage across that width

#### Scenario: Installation presentations are compared
- **WHEN** equivalent progress is rendered by self-update and fresh installation
- **THEN** both visible bar segments SHALL use the same 38-cell geometry

### Requirement: Automatic self-update remains visually background-only

Automatic self-update SHALL run without opening, focusing, flashing, or closing an additional console or terminal window. The automatic worker and every child process it starts SHALL remain detached from interactive terminal presentation while preserving bounded diagnostic capture and all existing update, recovery, activation, and cleanup guarantees. Explicit update commands SHALL retain their visible progress and diagnostics in the terminal that invoked them and SHALL NOT open a second terminal window.

#### Scenario: Automatic update runs on Windows
- **WHEN** an eligible interactive session starts automatic installation and the update process tree performs registry, npm, recovery, activation, or cleanup work
- **THEN** no additional console or terminal window SHALL appear or flash
- **AND** the initiating session SHALL remain interactive

#### Scenario: Explicit update is invoked
- **WHEN** the user runs an explicit `a1 update` command
- **THEN** progress and actionable diagnostics SHALL remain visible in the invoking terminal
- **AND** no separate terminal window SHALL be opened for update children

### Requirement: Restart-readiness observation is independent of release discovery
Every interactive published A1 process SHALL compare its executing immutable release with the locally recorded approved active release on a bounded short cadence. This local comparison SHALL not require a registry request, a successful dist-tag lookup, ownership of the automatic-update worker, or evidence that the process launched the active release. When the active release is valid semver, belongs to the executing release's channel, and is newer, the process SHALL report restart readiness and stop polling after that result. Unreadable, malformed, unapproved, same-version, older, source-checkout, and cross-channel state SHALL not produce restart readiness.

The local comparison SHALL remain available when update discovery is `Manual`, when registry lookup fails, and when network-oriented version checks are disabled, because it reads only already-committed local release state and starts no update. Disposal SHALL cancel the local observer.

#### Scenario: Another process activates the update
- **WHEN** one process activates an approved same-channel release newer than several still-running A1 processes
- **THEN** every older process SHALL report restart readiness within the bounded local observation interval
- **AND** none SHALL need to have launched, discovered, or installed the active version itself

#### Scenario: Registry discovery fails
- **WHEN** an older process cannot fetch or parse its channel dist-tag but the local approved active release is newer on the same channel
- **THEN** it SHALL still report restart readiness from local state
- **AND** the failed discovery SHALL start no additional update

#### Scenario: Update discovery is disabled
- **WHEN** a published older process uses `Manual`, or a network version-check opt-out applies, while a newer same-channel approved release is already active locally
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

### Requirement: Immutable release retention is age-based
Release retention SHALL keep active and selected releases, releases approved within seven days, and every release with a live or unverifiable process-lifetime use claim. Launch selection and claim acquisition SHALL exclude cleanup detachment until ownership is established. The claim SHALL protect release files, required certification evidence, and dependency layers until the process exits. Cleanup SHALL revalidate ownership before destructive boundaries, conservatively retain legacy releases lacking lifetime-claim support, and collect expired unclaimed releases only when safety is established. No supervisor or hot-swapping is required.

#### Scenario: An old release is collected
- **WHEN** an expired claim-capable release is not selected and all its recorded owners are proven absent
- **THEN** its release and unreferenced dependency layers MAY be collected without affecting another executing release

#### Scenario: A recent release is kept
- **WHEN** a release was approved within the last seven days but is no longer active
- **THEN** it SHALL remain on disk

#### Scenario: The record cannot be read
- **WHEN** approval or lifetime ownership cannot be established safely
- **THEN** retention SHALL keep the affected content and continue conservatively

#### Scenario: An old process survives several publications
- **WHEN** a process uses an expired release while newer releases activate
- **THEN** its root and dependency layers SHALL remain available for later lazy imports and helper launches until it exits

#### Scenario: Launch races cleanup
- **WHEN** a launch selects a retained release while cleanup considers it
- **THEN** claim acquisition and collection SHALL be mutually excluded so the launch never enters a detached root

#### Scenario: Legacy cleanup does not ignore lifetime ownership
- **WHEN** a claim-aware control process adopts a valid v1 release store
- **THEN** its locked update SHALL preserve the records and write a control-state schema that pre-claim cleanup readers refuse
- **AND** saved sessions SHALL remain unchanged and approved legacy release roots SHALL remain conservatively retained

### Requirement: Interactive startup checks for a newer release in Auto mode
When an interactive profile starts from a published build and the `Update` mode is not `Manual`, A1 SHALL discover whether a newer release exists on the executing release's channel, comparing valid semver only, after the first usable frame and never for noninteractive commands. `Auto` SHALL request a silent exact-target background update and show no availability notice; `Manual` SHALL skip the check entirely. Lookup, parse, or cache failure SHALL produce no UI diagnostic.

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
- **WHEN** any environment opt-out holds or bare A1 selects `Manual`
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

### Requirement: Release storage operations stay inside their managed root
Release cleanup, dependency-layer management, restart certification, and update recovery SHALL act on a path only when it is a direct child of its managed root. A direct child is one non-empty path segment below the root. It is never the root itself, a path on another root or drive, or a path that traverses to a parent. On Windows the comparison SHALL ignore case. An operation given any other path SHALL fail without touching it.

#### Scenario: A path escapes its managed root
- **WHEN** a release storage operation receives the root itself, a nested descendant, a sibling reached through `..`, or a path on another drive
- **THEN** the operation SHALL fail with its own diagnostic
- **AND** it SHALL NOT read, move, or delete that path

#### Scenario: A direct child differs only in case on Windows
- **WHEN** on Windows a release storage operation receives a direct child whose root differs only in letter case from the managed root
- **THEN** the operation SHALL accept the path

### Requirement: Self-update has one install path
Every self-update SHALL resolve npm's CLI entry before changing anything, SHALL make sure an approved prior release can launch before the package is replaced, SHALL replace the package through protected replacement, and SHALL roll back to the prior release when a later step fails. Which collaborators a caller supplies SHALL NOT change which of these steps run or their order.

#### Scenario: No approved release exists before an update
- **WHEN** a self-update starts and no approved release is active
- **THEN** it SHALL record and approve a recovery release from the running package before npm replaces the package
- **AND** it SHALL replace the package only through protected replacement

#### Scenario: Activation fails after the package was replaced
- **WHEN** activating the installed release fails
- **THEN** the update SHALL roll back to the prior active release and record the failure with the rollback result
- **AND** it SHALL exit with a non-zero status

### Requirement: Restart-ready announcements preserve large-session execution
Activation of an approved successor and its restart-ready announcement SHALL leave an existing large-session process on its executing immutable release, without aborting its agent work, replacing its session, disposing its UI, or requiring restart because its authoritative transcript exceeds the pending delivery allowance. The notice SHALL remain informational; ordinary subsequent input SHALL continue in the existing process, and only a later launch SHALL select the approved successor. Existing certification guarantees remain unchanged.

#### Scenario: Another process activates a successor during long-session work
- **WHEN** a retained published process has more than 8 MiB of authoritative transcript and observes a newer approved same-channel active release
- **THEN** it SHALL announce restart readiness without cancelling active work or changing executing-release or session identity
- **AND** subsequent commands SHALL remain usable on the original release

#### Scenario: Resume after an informational update notice
- **WHEN** the user later exits that large session and executes its normal resume command through a fixed installed entry
- **THEN** the new process SHALL select the approved release and restore the persisted conversation under the same-pin restoration contract
- **AND** the preceding announcement SHALL require no session-file repair, truncation, or migration

### Requirement: Install and update progress use a uniform centered stroke
Interactive self-update and fresh-install progress SHALL render every completed and remaining bar cell with the continuous centered heavy horizontal `━` glyph. The completed segment SHALL retain its selected semantic accent, the remaining segment SHALL retain its muted gray track color, and the percentage SHALL retain its neutral text treatment. This stroke change SHALL preserve the existing 38-cell width, proportional fill and percentage calculations, single space before the percentage, terminal style reset, animation, and cleanup behavior.

#### Scenario: A partially completed frame is displayed
- **WHEN** self-update or the installer displays partial progress
- **THEN** the completed and remaining segments SHALL use the same `━` glyph and differ by their existing accent and track colors
- **AND** neither segment SHALL use separated rectangle glyphs or bottom-aligned block glyphs

#### Scenario: Progress is empty or complete
- **WHEN** a renderer displays zero or full progress
- **THEN** the bar SHALL still contain exactly 38 heavy horizontal cells followed by one space and the numeric percentage
- **AND** its existing neutral percentage styling and final foreground reset SHALL be preserved

#### Scenario: Installer and self-update display the same progress
- **WHEN** both renderers receive the same percentage and accent
- **THEN** their rendered frames SHALL remain byte-equivalent

### Requirement: The installed release owns its post-activation work
After an updater delegates activation to the installed tree's activation entry, the updater SHALL NOT mutate release control state with its own code. The activation entry SHALL schedule release maintenance with the tree's own code after it commits the active reference. A maintenance failure SHALL be reported only as bounded diagnostics and SHALL NOT change the entry's `completed` verdict. An updater that activates an older tree in-process SHALL keep running maintenance itself. An updater SHALL ignore activation events it does not recognize, while malformed lines and malformed known events SHALL still fail the activation.

#### Scenario: A newer tree activates itself
- **WHEN** the updater delegates activation and the entry reports `completed`
- **THEN** the entry SHALL have scheduled maintenance with the new release's code
- **AND** the updater SHALL NOT run its own maintenance

#### Scenario: A newer tree reports an additional event
- **WHEN** the activation entry writes a well-formed event whose kind the updater does not know
- **THEN** the updater SHALL ignore it and continue relaying known events

### Requirement: A committed activation is never rolled back
Once the transaction journal records `active-reference-committed`, the update SHALL be complete. A later failure in post-activation work, delegated-entry exit, recovery-capsule removal, or maintenance SHALL finish the transaction as completed and report success with a bounded warning that cleanup will retry. It SHALL NOT attempt rollback. Interrupted-lease recovery SHALL settle a committed transaction the same way. When `a1 update` finds a settled transaction that reached the committed phase and its target is the active release, it SHALL take the up-to-date path instead of reinstalling.

#### Scenario: Post-activation work fails
- **WHEN** maintenance or the activation entry fails after the active reference was committed
- **THEN** the update SHALL report success with a warning and SHALL leave the new release active

#### Scenario: A failed committed update is retried
- **WHEN** a previous update failed after commit and its target is active
- **THEN** `a1 update` SHALL clear the journal and report that A1 is up to date without running npm

### Requirement: Release control state is compatible across releases
Release control state SHALL carry ordered compatibility levels: the lowest reader level that may read it and the lowest that may write it, with level 1 for state that carries none. Additive fields SHALL NOT raise either level, and code SHALL preserve fields it does not know when it writes. A level SHALL be raised only for a change older code would misinterpret. Writers SHALL never lower stored levels. Code below the read level SHALL refuse with an error identifying a newer release. Code below the write level SHALL read the state but refuse writes, and launch claims, cleanup scheduling, and cleanup workers SHALL skip their writes instead of failing. The family identifier SHALL remain stable so already-published releases that read it continue to do so.

#### Scenario: A newer release adds a field
- **WHEN** a newer release writes state with an additional field at the same levels
- **THEN** older releases SHALL read and update the state and SHALL preserve that field

#### Scenario: A newer release raises the write level
- **WHEN** state requires a write level above the running code's level
- **THEN** that code SHALL read it, SHALL skip housekeeping and launch claims, and SHALL NOT fail a launch or update

### Requirement: Release control-state writes are durable on Windows
A control-state write SHALL retry its atomic replacement for a bounded time when the platform reports a transient sharing failure. On final failure it SHALL remove its temporary file. Writers SHALL reclaim temporary state files left by writers that are no longer running and SHALL NOT touch a running writer's file.

#### Scenario: Another process reads the state during a write
- **WHEN** the atomic replacement is briefly refused because the target is open
- **THEN** the write SHALL succeed after retrying and SHALL leave no temporary file

### Requirement: Predecessor updaters settle state after candidate activation
Release validation SHALL show that each recent published predecessor that reads the current state family can delegate activation to the exact candidate and then read, update, and schedule maintenance on the resulting control state with its own code. Predecessors that do not read the current family SHALL be identified by their exported capabilities, not by version number.

#### Scenario: The candidate changes control state
- **WHEN** the candidate writes control state during its activation
- **THEN** every eligible predecessor SHALL still read, update, and maintain it without error
