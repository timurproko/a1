# silent-installer Specification

## Purpose
TBD - created by archiving change add-silent-a1-installer. Update Purpose after archive.

## Requirements

### Requirement: The official installer bootstrap is minimal before custom installation begins
The preferred stable installation command SHALL be `npx -y @timurproko/a1-install`. The development form SHALL append `--develop`, and an exact development form SHALL append `--develop <preview-or-version>`. Bare forms without `-y` SHALL also work and MAY show npm's first-use confirmation. The installer package SHALL expose exactly one `a1-install` executable, SHALL use only supported Node built-ins at runtime, and SHALL declare no production, optional, peer, or runtime-required development dependency, funding metadata, or npm installation lifecycle script.

The dependency-free outer acquisition SHALL introduce no package-originated deprecation, lifecycle-script, dependency-funding, or audit transcript. npm MAY show its own minor bootstrap/version notice or acquisition error before installer execution; those outer messages are not part of the installer-owned transcript. The corresponding direct global npm commands for `@latest`, `@next`, and an exact numbered development version MAY remain documented as explicit manual or recovery fallbacks but SHALL NOT be presented as the preferred controlled paths after installer availability is accepted.

#### Scenario: A user starts the preferred installation
- **WHEN** the user runs `npx -y @timurproko/a1-install`
- **THEN** npm SHALL acquire the dependency-free installer without a first-use confirmation
- **AND** the installer SHALL own subsequent main-install terminal presentation

#### Scenario: A user omits automatic confirmation
- **WHEN** the user runs `npx @timurproko/a1-install`
- **THEN** the same installer SHALL run after any npm-owned first-use confirmation
- **AND** minor outer npm bootstrap text SHALL NOT permit the main A1 child transcript to leak

#### Scenario: A user selects the development channel
- **WHEN** the user appends `--develop` after `@timurproko/a1-install`
- **THEN** `npx` SHALL forward the selector to the installer
- **AND** the installer SHALL resolve A1's `next` channel rather than changing the installer package channel

#### Scenario: A user selects an exact development version
- **WHEN** the user appends `--develop 107` or `--develop 0.1.8-dev.107` after `@timurproko/a1-install`
- **THEN** `npx` SHALL forward the selector and value to the installer
- **AND** the installer SHALL select only the uniquely matching immutable published A1 preview

#### Scenario: Installer acquisition fails
- **WHEN** npm cannot acquire the installer package and its executable never starts
- **THEN** npm MAY emit its own acquisition error
- **AND** no A1 success message SHALL appear

#### Scenario: The installer tarball is inspected
- **WHEN** the exact `@timurproko/a1-install` artifact is unpacked
- **THEN** it SHALL contain exactly the declared installer executable and required metadata/assets
- **AND** its manifest SHALL contain no funding metadata, install lifecycle script, or runtime dependency graph capable of producing transitive warning output

### Requirement: Successful installation shows controlled progress and one success message
In an interactive terminal, the installer SHALL display one carriage-return progress row conforming exactly to A1 self-update's 40-cell bar width, glyphs, blue/teal `#8abeb7` completed segment, grey remaining track, grey percentage treatment, and style reset. Progress SHALL be non-decreasing, SHALL use measured activation progress where available, and MAY creep toward but SHALL NOT render an unreached milestone during opaque npm work. The visible row SHALL end at the numeric `<percentage>%` treatment and SHALL contain no phase, status, package, or other wording after it. Every redraw SHALL erase terminal content to the right of the current frame so no suffix from an earlier longer row remains visible. Internal child-event classification MAY continue without becoming terminal text.

Every main-install child process SHALL have stdout and stderr captured rather than inherit the terminal. The installer MAY run npm verbosely into a private temporary log and classify recognized events internally. Output from a successful child SHALL otherwise be discarded, including deprecation warnings, funding text, audit summaries, lifecycle-script policy warnings, package counts, and npm version notices. After all installation and verification work succeeds, the progress row SHALL be completed and removed or replaced, and stdout SHALL contain exactly `a1 successfully installed` followed by one newline in the terminal's unstyled default foreground, matching update success and appearing white under the maintainer's current terminal theme. It SHALL NOT use green or another fixed success color.

Normal installer output SHALL NOT disclose the npm prefix, package root, launcher path, user home, data directory, target version, dependency names, or package/file counts. A path MAY appear only in a bounded actionable failure or explicit verbose diagnostic when identifying it is necessary to recover safely. When output is not interactive, the animated row and ANSI styling SHALL be omitted and the same final success line SHALL remain.

#### Scenario: npm succeeds after writing warnings
- **WHEN** npm installs the exact target successfully while writing deprecation, funding, lifecycle-policy, package-count, or version notices
- **THEN** none of that child output SHALL reach the terminal
- **AND** the user SHALL observe one progress row ending at its percentage followed by exactly `a1 successfully installed`

#### Scenario: A shorter progress frame replaces earlier content
- **WHEN** an interactive progress frame redraws a row that previously contained additional text
- **THEN** the new visible row SHALL end at `<percentage>%`
- **AND** no characters from the previous row SHALL remain visible to its right

#### Scenario: npm work has no measured completion
- **WHEN** the global npm child remains active without reporting usable progress
- **THEN** the progress row MAY continue moving toward its next milestone
- **AND** SHALL remain visibly below that milestone until npm exits successfully

#### Scenario: Normal installation output is inspected
- **WHEN** a stable, development, or exact-version installation proceeds normally
- **THEN** no installation destination, npm prefix, launcher path, user path, target version, dependency identity, or count SHALL be printed

#### Scenario: Output is redirected
- **WHEN** the installer succeeds without an interactive output terminal
- **THEN** stdout SHALL contain exactly `a1 successfully installed` followed by one newline
- **AND** SHALL contain no carriage-return progress frames or ANSI styling

### Requirement: Installation resolves and verifies one exact target
The installer SHALL use the active npm executable and configuration to resolve the stable `latest` channel by default, the development `next` channel for bare `--develop`, or one immutable published numbered development version for `--develop <preview-or-version>`. It SHALL validate the authoritative `@timurproko/a1` identity and one exact semantic version and SHALL pass that exact version rather than a moving tag to the global mutating command. A numeric preview SHALL resolve only when exactly one published application version ends in that development number; a full preview SHALL resolve only when that exact version is published. It SHALL use cross-platform fixed argument arrays, SHALL NOT construct an interpolated shell command, and SHALL NOT persistently change npm configuration. Zero-numbered or malformed previews, duplicate selectors, unsupported options, ambiguous preview numbers, and extra arguments SHALL fail before installation mutation.

A fresh installation SHALL report success only after npm exits successfully, the canonical global package path identifies the exact target and expected package role, the complete platform launcher set targets that package, the installed tree's declared activation contract reports completion, the exact release is active, and command resolution selects the installed launcher rather than a stale or foreign executable. A later ordinary launch SHALL not need to print installation or activation output. Normal success SHALL keep every verified path private.

#### Scenario: The stable channel is resolved
- **WHEN** active npm reports a valid latest A1 version for a bare installer invocation
- **THEN** the installer SHALL globally install `@timurproko/a1@<that-exact-version>` with fixed arguments and captured streams
- **AND** SHALL NOT mutate npmrc or global/user npm settings

#### Scenario: The development channel is resolved
- **WHEN** the installer receives bare `--develop` and active npm reports a valid A1 `next` version
- **THEN** the installer SHALL globally install that exact resolved development version with fixed arguments

#### Scenario: A numbered development preview is selected
- **WHEN** the installer receives `--develop 107` and npm lists exactly one published version ending in `-dev.107`
- **THEN** the global mutating command SHALL name that exact published version
- **AND** SHALL perform no moving-channel selection

#### Scenario: An exact development version is selected
- **WHEN** the installer receives `--develop 0.1.8-dev.107` and npm lists that exact publication
- **THEN** the global mutating command SHALL name exactly `@timurproko/a1@0.1.8-dev.107`
- **AND** SHALL perform no moving-channel selection

#### Scenario: Target selectors conflict
- **WHEN** a selector is repeated, a preview is zero-numbered or malformed, a numeric preview is absent or ambiguous, an exact preview is absent, or an unsupported option or extra argument is supplied
- **THEN** the installer SHALL fail before installation mutation

#### Scenario: npm exits zero but the target is incomplete
- **WHEN** package identity, version, role, launcher ownership, activation verdict, or active release does not match the resolved target
- **THEN** the installer SHALL fail without printing the success message

#### Scenario: Installation is complete
- **WHEN** package installation, launcher verification, immutable materialization, certification, warmup, supervision, active-reference commit, and command-resolution verification all succeed for the exact target
- **THEN** the installer SHALL print its exact success result without printing the installation destination
- **AND** the next `a1` invocation SHALL use the already active release without installation diagnostics

#### Scenario: Another launcher wins command resolution
- **WHEN** the installed launcher set is complete but the invoking environment resolves `a1` to a stale or foreign launcher
- **THEN** the installer SHALL not report complete success
- **AND** SHALL emit one concise actionable result without exposing the conflicting path unless verbose diagnostics are requested

### Requirement: Existing installations retain cancellation-safe replacement
Before starting direct global installation, the installer SHALL distinguish an absent A1 package from a canonical valid existing installation. It MAY directly install only when no existing global A1 package owns the target location. When a valid supported A1 installation and complete launcher set already exist, the installer SHALL map stable, development-channel, and exact-development-version selection to that installation's cancellation-safe update forms while capturing its streams behind the installer presentation.

A linked, foreign, malformed, partial, unsupported, mismatched, or ambiguously owned existing package or launcher set SHALL be refused before mutation. The installer SHALL NOT delete, rename, adopt, or directly overwrite such a tree.

#### Scenario: A1 is not installed
- **WHEN** the canonical active global root contains no A1 package or launcher ownership
- **THEN** the installer SHALL use its fresh global installation path

#### Scenario: A1 is already installed validly
- **WHEN** a supported canonical A1 package and complete launcher set are present
- **THEN** the installer SHALL use the installed cancellation-safe update path rather than an unguarded direct overwrite
- **AND** successful child output SHALL remain hidden behind the installer transcript

#### Scenario: An existing installation receives an exact target
- **WHEN** a supported existing installation is valid and the installer selected `0.1.8-dev.107`
- **THEN** the installer SHALL delegate through the installed updater's exact development-preview form rather than directly overwrite the package

#### Scenario: Existing ownership is ambiguous
- **WHEN** the package path or launcher set is linked, foreign, partial, mismatched, unsupported, or cannot be verified
- **THEN** the installer SHALL fail before global mutation with no success text
- **AND** SHALL leave the observed package, launchers, processes, and A1 user data unchanged

### Requirement: Installation failures are concise and truthful
After installer execution begins, a failure SHALL clear the progress row, restore cursor visibility and terminal styling, write no success text, return a nonzero status, and emit one default stderr line in the form `installation failed: <concise reason>`. The concise reason SHALL come from this fixed vocabulary: `invalid command arguments`, `--verbose was supplied more than once`, `--develop was supplied more than once`, `--version was supplied more than once`, `--develop cannot be combined with --version`, `--version requires an exact development version`, `--help cannot be combined with another option`, `unsupported option`, `unexpected argument`, `Node.js 22.19.0 or newer is required`, `npm is unavailable`, `could not resolve the selected release`, `the selected release was not found`, `network access failed`, `registry authentication failed`, `permission was denied`, `npm installation failed`, `the npm global installation cannot be verified`, `the installed package is incomplete`, `the installed package identity is invalid`, `the installed version does not match the selected release`, `launcher verification failed`, `the installed command is not active in this shell`, `another command takes precedence`, `activation failed`, `existing installation ownership could not be verified`, `existing installation could not be updated`, or `unexpected installer failure`.

The installer SHALL retain only a bounded private child-diagnostic tail and classify common npm startup, network, registry, permission, integrity, activation, and launcher failures without replaying raw warning output, stack traces, progress fragments, credentials, request headers, or an unbounded npm transcript. Any temporary progress log SHALL be installer-owned and removed after success or after its bounded failure evidence has been consumed.

An explicit troubleshooting mode MAY append bounded terminal-safe diagnostics after failure and SHALL redact credentials and tokens. It SHALL NOT change the operation's verdict. Cancellation SHALL be unsuccessful with status `130`, SHALL terminate or contain owned children, SHALL restore terminal state, SHALL never report installation success, and SHALL use `installation cancelled` as its exact concise result. For interrupted fresh installation, the installer SHALL delete only its owned temporary evidence and SHALL permit retry without claiming rollback or deleting an uncertain npm-owned global tree.

#### Scenario: Global installation fails with noisy stderr
- **WHEN** npm writes warnings and an actionable error before exiting unsuccessfully
- **THEN** the default terminal SHALL receive one concise installer-owned failure line and no raw warning wall
- **AND** the installer SHALL return nonzero

#### Scenario: Troubleshooting is requested
- **WHEN** the same failure occurs under the explicit verbose mode
- **THEN** the installer MAY append a bounded sanitized diagnostic after the failure result
- **AND** SHALL redact credentials/tokens and preserve the same unsuccessful verdict

#### Scenario: The user cancels a fresh installation
- **WHEN** cancellation is received while npm may be mutating the first global installation
- **THEN** the installer SHALL terminate or await the child according to its safe signal boundary, clear progress, and report cancellation without success
- **AND** SHALL NOT recursively delete or claim rollback authority over an uncertain global package tree

#### Scenario: Rendering or execution is interrupted
- **WHEN** success, failure, signal cancellation, or an unexpected exception ends an interactive run
- **THEN** the cursor, foreground style, and progress row SHALL be restored exactly once
- **AND** no spinner worker, timer, or child-output log SHALL remain live

#### Scenario: The user retries after interruption
- **WHEN** a prior fresh installation ended unsuccessfully and no valid existing installation can be delegated to
- **THEN** a retry SHALL either converge through npm and complete all verification or fail truthfully without requiring deletion of A1 user data

### Requirement: Package-manager launch indirection executes the installer
The `a1-install` executable SHALL recognize direct execution by canonical filesystem identity rather than requiring the invoking path to lexically equal the package module path. It SHALL execute through npm-generated Unix file symlinks, direct package-file invocation, and supported Windows npm command shims while ordinary ESM import remains side-effect free. Resolving launch indirection SHALL use only supported Node built-ins and SHALL NOT broaden execution based only on a basename, option, environment variable, or expected directory shape.

Installed Unix application-launcher ownership SHALL likewise compare the canonical filesystem identity of the launcher target with the canonical expected application entry. Lexical aliases in an ancestor path SHALL NOT cause a valid npm launcher to be rejected, and canonicalization SHALL NOT permit a launcher resolving to any other entry.

#### Scenario: npm invokes the Unix bin symlink
- **WHEN** npm installs the exact installer package into an isolated Unix global prefix and the generated `bin/a1-install` symlink is invoked with `--help`
- **THEN** the installer SHALL follow that launch indirection to recognize direct execution
- **AND** SHALL exit zero with the exact help contract on stdout and empty stderr

#### Scenario: A consumer imports installer helpers
- **WHEN** another ESM module imports the installer executable to use or test its exported helpers
- **THEN** the installer SHALL NOT run its main operation, write help or installation output, or alter the importing process verdict

#### Scenario: The npm prefix has a lexical filesystem alias
- **WHEN** the installed `a1` launcher and expected application entry are reached through different lexical ancestor paths that canonically identify the same files
- **THEN** launcher verification SHALL accept the canonical identity match
- **AND** SHALL still reject a launcher whose canonical target is any other entry

### Requirement: Activation transcript framing preserves complete events within fixed memory bounds
The installer SHALL split child-process output into complete newline-delimited activation events before applying a fixed bound to an unresolved trailing fragment. It SHALL deliver every complete event intact even when one received chunk exceeds the diagnostic retention limit. Retained stdout, stderr, and unterminated fragments SHALL remain bounded, and malformed, unknown, or truncated activation evidence SHALL continue to fail installation.

#### Scenario: One chunk contains more than the diagnostic window of valid events
- **WHEN** activation emits a single received chunk containing more than 8 KiB of complete newline-delimited JSON events
- **THEN** the installer SHALL parse every complete event without corrupting the first line
- **AND** successful completion evidence SHALL remain eligible

#### Scenario: An activation event spans chunks
- **WHEN** one valid activation event ends in a later child-process chunk
- **THEN** the installer SHALL retain and reassemble its bounded partial line before parsing it

#### Scenario: A child emits an oversized unterminated line
- **WHEN** activation output exceeds the fragment bound without a newline
- **THEN** retained memory SHALL remain bounded
- **AND** the output SHALL fail strict activation validation rather than being accepted as success

### Requirement: Fresh installation and self-update share one target grammar
The installer SHALL use the same release-target grammar as A1 self-update. Bare invocation SHALL select the stable `latest` channel. `--develop` without a value SHALL select the moving development `next` channel. `--develop <positive-preview-number>` SHALL select the unique published development version carrying that preview number, and `--develop <full-development-version>` SHALL select that exact published preview.

The published application version list SHALL remain authoritative for requested previews. An absent or ambiguous numeric preview, absent exact preview, stable version after `--develop`, zero or malformed preview, repeated selector, missing usable selector value, unsupported option, or extra argument SHALL fail before installation mutation. The installer SHALL NOT support `--version`, `--latest`, or `--next` as compatibility aliases. npm package suffixes on `@timurproko/a1-install` SHALL remain installer-acquisition selectors and SHALL NOT be interpreted as application-target syntax.

When an existing valid installation receives an exact preview request, the installer SHALL delegate through `a1 update --develop <full-development-version>`. Documentation and help SHALL present only this aligned grammar.

#### Scenario: A user selects stable installation
- **WHEN** the user runs `npx -y @timurproko/a1-install`
- **THEN** the installer SHALL resolve and install the application package's `latest` channel
- **AND** the form SHALL match bare `a1 update` for an existing installation

#### Scenario: A user selects the development head
- **WHEN** the user runs `npx -y @timurproko/a1-install --develop`
- **THEN** the installer SHALL resolve and install the application package's `next` channel
- **AND** the form SHALL match `a1 update --develop`

#### Scenario: A user selects a numbered preview
- **WHEN** the user runs `npx -y @timurproko/a1-install --develop 107`
- **THEN** the installer SHALL inspect published application versions and select the unique version ending in `-dev.107`
- **AND** it SHALL fail rather than guess when that number is absent or ambiguous

#### Scenario: A user selects an exact preview
- **WHEN** the user runs `npx -y @timurproko/a1-install --develop 0.1.8-dev.107`
- **THEN** the installer SHALL select that version only when the registry lists it
- **AND** the form SHALL match `a1 update --develop 0.1.8-dev.107`

#### Scenario: A removed selector is supplied
- **WHEN** the user supplies `--version`, `--latest`, or `--next`
- **THEN** the installer SHALL reject the unsupported option before registry discovery or installation
- **AND** help and documentation SHALL NOT advertise a compatibility alias
