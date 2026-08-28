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
A1 SHALL verify through npm's global package root that the running package is managed by the active global npm installation before replacing it. It SHALL refuse automatic replacement when running from a local checkout, npm link, or a different package-manager context.

#### Scenario: Running package is globally managed by npm
- **WHEN** the running A1 package is contained by the canonical global npm package root
- **THEN** A1 may perform the global update

#### Scenario: Running package is not managed by global npm
- **WHEN** the running A1 package is outside the canonical global npm package root
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
A1 SHALL stream relevant npm diagnostics and exit unsuccessfully when registry lookup, npm startup, permission acquisition, or global installation fails. It MUST NOT report a successful update unless npm completed the requested global installation successfully.

#### Scenario: npm is unavailable
- **WHEN** the platform npm executable cannot be started
- **THEN** A1 reports that npm could not be executed and exits unsuccessfully

#### Scenario: Global installation is rejected
- **WHEN** npm rejects installation because of permissions, network access, registry policy, or package validation
- **THEN** A1 preserves npm diagnostics, reports that the update failed, and exits with an unsuccessful status

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

#### Scenario: An update is watched
- **WHEN** an update copies thousands of files
- **THEN** the terminal SHALL show one progress line and no per-file output

#### Scenario: A launch activates a release
- **WHEN** bare A1 launches and activates a materialized release
- **THEN** nothing about that activation SHALL be written to the terminal

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
