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
A1 SHALL verify through npm's global package-root resolution that the running package occupies the exact `@timurproko/a1` package location in an npm-managed global installation before replacing it. The installation MAY use npm's active default prefix or a different prefix whose inferred global root active npm independently confirms and whose complete platform launcher set targets that package. A1 SHALL pin replacement to the confirmed prefix that owns the running package. It SHALL refuse automatic replacement when running from a local checkout, npm link, malformed package layout, unconfirmed root, or a different package-manager context.

#### Scenario: Running package is globally managed by npm
- **WHEN** the running A1 package exactly occupies its canonical package location beneath npm's canonical active global package root
- **THEN** A1 may perform the global update against that root

#### Scenario: Running package is managed under a confirmed non-default npm prefix
- **WHEN** the running A1 package exactly occupies the canonical package location under another global root, active npm confirms that root for its inferred prefix, and the prefix's complete launcher set targets that package
- **THEN** A1 SHALL update the invoked installation in place using that explicit prefix
- **AND** SHALL NOT create or select an installation under the active default prefix merely because the defaults differ

#### Scenario: Running package is not managed by global npm
- **WHEN** the running package path does not have npm's exact global package layout or active npm does not confirm the inferred root
- **THEN** A1 exits unsuccessfully and prints the manual npm installation command without modifying any package, launcher, supervisor, or update transaction

#### Scenario: Running package is linked or checked out locally
- **WHEN** the running A1 package canonicalizes to a local checkout, npm link target, or another package-manager context
- **THEN** A1 exits unsuccessfully and prints the manual npm installation command without modifying any installation

### Requirement: Update is isolated from the interactive runtime
The update subcommand SHALL complete or fail without starting the A1 supervisor, attaching to an existing supervisor, launching the TUI, or launching an agent.

#### Scenario: Update is requested while no supervisor exists
- **WHEN** the user invokes the update subcommand
- **THEN** only the npm update workflow runs and no supervisor endpoint is created

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
`a1` executable. `a1 update` SHALL select the stable release. `a1 update --develop`
SHALL select the current development preview, and one optional value after
`--develop` SHALL select either a positive numbered preview or a full numbered
preview version.

`a1 update --models` and `a1 pi update --models` SHALL be equivalent model-catalog
refresh commands against the A1 profile and SHALL NOT self-update A1 or its pinned
Pi runtime. `--models` SHALL NOT combine with `--develop` or a preview value.

#### Scenario: Update through a1
- **WHEN** the user invokes `a1 update`
- **THEN** A1 SHALL run the stable self-update workflow

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
- **WHEN** `--develop`, its optional preview value, or `--models` are combined outside the declared grammar
- **THEN** A1 SHALL fail before registry, package, supervisor, or runtime work

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
release the update installs SHALL be what the next launch starts on.

Where a running session cannot be preserved because it runs from the package being replaced, the
update SHALL say which session it is ending and why, before ending it.

#### Scenario: A session is working when an update runs
- **WHEN** the user updates in one terminal while an agent turn streams in another
- **THEN** the update SHALL install and report success
- **AND** the working session SHALL continue its turn, keep its transcript, and keep accepting
  input

#### Scenario: The next launch after an update
- **WHEN** a new session starts after an update, while an older session is still working
- **THEN** the new session SHALL start on the installed release
- **AND** the older session SHALL remain on the release it started on

#### Scenario: A session must be ended to replace the package
- **WHEN** the running session cannot be preserved because it runs from the package being replaced
- **THEN** the update SHALL report that it is ending that session and why before doing so

### Requirement: A preview can be installed by name
What follows the colon on `update` SHALL say which build to move to. `next` SHALL
mean the newest preview, and anything else SHALL name a preview outright — by the
commit it was built from, or by its full version. A preview is published as
`<version>-dev.<commit>`, so the commit alone SHALL be enough to identify one, and
the version in front of it SHALL NOT have to be supplied.

The named preview SHALL be resolved against the versions the registry actually
published rather than constructed from the name. A name matching nothing SHALL be
refused and named in the refusal; a name matching more than one published version
SHALL be refused rather than resolved to a guess. Nothing SHALL be installed in
either case.

What may be named there is a preview. A published release named after the colon
SHALL be refused, SHALL be told apart from a preview in the refusal, and SHALL
point at the command that moves to the current release — installing a release
through the preview path would record it as something it is not.

An empty or unusable name SHALL be refused before anything is asked of the
registry, and the command SHALL take no argument after the colon form.

#### Scenario: A commit is named
- **WHEN** the user runs `a1 update:<commit>` for a commit whose preview was published
- **THEN** A1 SHALL install that preview, whatever version it carries

#### Scenario: A full version is named
- **WHEN** the user runs `a1 update:<version>` for a published preview version
- **THEN** A1 SHALL install that version

#### Scenario: A release is named
- **WHEN** the user names a published release rather than a preview
- **THEN** A1 SHALL refuse, say that it is a release, point at the release command, and install nothing

#### Scenario: The name matches nothing
- **WHEN** the named commit or version was never published
- **THEN** A1 SHALL refuse, name what it could not find, and install nothing

#### Scenario: The name matches more than one version
- **WHEN** a commit appears in more than one published version
- **THEN** A1 SHALL refuse, list what it found, and ask for a version instead

#### Scenario: The newest preview is wanted
- **WHEN** the user runs `a1 update:next`
- **THEN** A1 SHALL install whatever the preview channel currently points at

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
- **THEN** it SHALL use only A1's selected profile and SHALL NOT update packages, update either executable, launch the UI, or contact the supervisor

### Requirement: Successful update initiates bounded release cleanup
Before reporting a completed update, A1 SHALL durably commit the protected release set and a restart-safe cleanup disposition for obsolete releases. Potentially long physical deletion MAY continue after that commit, but the update SHALL start background maintenance that continues ordinary eligible work to completion without requiring another user command. Update and later maintenance entry points SHALL resume interrupted or temporarily blocked cleanup without requiring manual state or directory deletion, and SHALL retain bounded evidence of worker progress, continuation, and top-level failure.

#### Scenario: Update activates a new release
- **WHEN** the new release is certified, active, and served by a verified supervisor
- **THEN** the update SHALL commit retention of the active, rollback, pending, live, and externally held releases
- **AND** SHALL initiate collection of every other known release

#### Scenario: Historical append-only state exists
- **WHEN** the first cleanup-aware update reads a valid older cohort state whose retention list contains every previously activated release
- **THEN** A1 SHALL migrate it to the bounded protected set without deleting a release used by a verified live cohort or rollback

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
- **THEN** its warmup and supervision SHALL receive the required neutral launch context and satisfy the existing readiness and verification requirements

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
The first installation adopting the neutral private contract SHALL be a deliberate clean cutover, not a supported old-to-new self-update or migration path. Its handoff SHALL instruct the maintainer to stop existing application, supervisor, and worker processes and install the accepted new package directly through npm. It SHALL NOT rely on an old `a1 update` command or old recovery launcher completing the cutover.

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
After the clean cutover, different release versions using the same private contract SHALL support normal launch, comparison launch, update activation, retained-session continuity, rollback, and interrupted-update recovery under the existing lifecycle rules. The naming refactor SHALL NOT weaken immutable-root verification, content certification, ownership checks, containment, public-setting validation, or existing startup/update budgets.

Owned outgoing context SHALL be reconstructed from the verified selected target and current launch intent rather than stale inherited private values. Required fields SHALL form a coherent current context, and invalid or missing fields SHALL fail before use without falling back to another release or default path. Platform-specific casing SHALL NOT permit ambiguous duplicate private keys. Diagnostics SHALL identify the logical setting without dumping unrelated environment values.

Acceptance SHALL include executable tests for current-contract lifecycle operations, rejection of obsolete-only private input and unsupported targets, and preservation of protected user data. Successful pre-cutover interoperability tests are not required and SHALL NOT be replaced with compatibility behavior merely to make historical fixtures pass.

#### Scenario: A supported session remains active during update
- **WHEN** an update installs another release using the current private contract while a retained session on that contract is working
- **THEN** the session SHALL retain its release, transcript, input, containment, and cohort connection
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
Update recovery evidence SHALL bind one transaction identity, canonical npm global root, package root, complete launcher path set, prior verified release identity, target version, recovery payload digest, npm executable, and installation arguments. For a newly created transaction, those arguments SHALL explicitly pin the npm prefix derived from the bound global root. Recovery evidence SHALL be committed before destructive replacement, consumed only within those bounds, and removed after the transaction and launcher disposition are complete. The recovery mechanism SHALL NOT add another public command, trust arbitrary npm temporary paths or prefixes, or weaken immutable release validation. A valid recovery capsule created before explicit-prefix binding SHALL remain readable only with its exact legacy unprefixed installation arguments and all other existing authority checks intact.

#### Scenario: Recovery capsule is prepared
- **WHEN** A1 is ready to begin global package replacement
- **THEN** it SHALL commit the bounded recovery payload and identity before npm can remove a public launcher
- **AND** the recorded npm arguments SHALL select the exact package target and prefix bound by the capsule

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

### Requirement: Update progress uses the scrollbar-aligned accent
When A1 shows self-update progress in a color-capable terminal, the completed segment SHALL use the fixed teal accent `#8abeb7` that matches the requested scrollbar presentation. The remaining segment SHALL retain its muted track color, and the percentage text SHALL retain its existing neutral treatment.

The color change SHALL NOT alter the progress bar's glyphs, width, percentage calculation, monotonic movement, or cleanup behavior.

#### Scenario: An update is in progress
- **WHEN** A1 renders a partially completed self-update progress bar
- **THEN** the completed segment SHALL render in `#8abeb7`
- **AND** the remaining segment SHALL render in its muted track color
- **AND** the visible bar geometry and percentage SHALL remain unchanged

#### Scenario: Progress reaches either boundary
- **WHEN** A1 renders zero or complete self-update progress
- **THEN** it SHALL preserve the same accent and muted-track color contract for every segment that is present
- **AND** it SHALL reset terminal foreground styling after the percentage text

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

A tree that declares no contract the updater serves SHALL be activated in-process with the layout that tree had, so an updater older than the contract and an installation of an older preview both remain supported. A delegated activation SHALL succeed only when the entry exits successfully after reporting `completed`; a `failed` event, an unsuccessful exit, an exit without a verdict, or an event the updater cannot interpret SHALL fail the update with the entry's own bounded reason under the existing rollback rules. The entry's stderr SHALL be captured and bounded, never shared with the terminal.

#### Scenario: The installed tree serves the contract
- **WHEN** the newly installed manifest lists `activate-v1` and the updater serves it
- **THEN** the updater starts the tree's `bin/activate.js` and advances its journal phases and progress display from the events that entry reports
- **AND** the updater runs none of the materialization, certification, warmup, or supervision steps itself

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
