# extension-packages Specification

## Purpose
Define non-interactive extension package management for A1's own profile through the `a1 pi` command namespace. Preserve pinned Pi source grammar, command transcripts, and actionable failures while isolating other profiles and preventing independent updates of the pinned Pi runtime.

## Requirements

### Requirement: Package commands manage the A1 profile only
`a1 install <source>`, `a1 remove <source>`, its alias `a1 uninstall <source>`,
`a1 list`, `a1 update --extensions`, `a1 update <source>`, and `a1 update
--models` SHALL be the preferred package and model commands and SHALL operate on
A1's own profile. The corresponding supported `a1 pi install`, `remove`,
`uninstall`, `list`, and `update` forms SHALL remain compatibility aliases that
produce the same operation requests and outcomes. Model refresh SHALL NOT update
packages, A1, or Pi.

Project-local package mutation and package configuration are reserved for a
separate trust and configuration design and SHALL NOT be advertised as supported
by this change.

#### Scenario: Install an npm package
- **WHEN** the user runs `a1 install npm:pi-mcp-adapter`
- **THEN** A1 SHALL install the package beneath `<home>/.a1/agent` and add its source to that profile's settings
- **AND** the next bare `a1` SHALL load the extension the package provides

#### Scenario: Remove an installed package
- **WHEN** the user runs `a1 remove npm:pi-mcp-adapter` or `a1 uninstall npm:pi-mcp-adapter`
- **THEN** A1 SHALL remove the installed content and the settings entry from the A1 profile
- **AND** both spellings SHALL behave identically

#### Scenario: List installed packages
- **WHEN** the user runs `a1 list`
- **THEN** A1 SHALL report the packages configured in the A1 profile with where each is installed
- **AND** SHALL say plainly that none are installed rather than printing nothing

#### Scenario: Update every installed package
- **WHEN** the user runs `a1 update --extensions`
- **THEN** A1 SHALL update every installed package in the A1 profile without performing an A1 self-update

#### Scenario: Update one installed package
- **WHEN** the user runs `a1 update npm:pi-mcp-adapter`
- **THEN** A1 SHALL update the matching package in the A1 profile without performing an A1 self-update

#### Scenario: Refresh model catalogs directly
- **WHEN** the user runs `a1 update --models`
- **THEN** A1 SHALL refresh the model catalogs under the A1 profile without updating packages, A1, or Pi

#### Scenario: Refresh model catalogs through the Pi namespace
- **WHEN** the user runs the compatibility form `a1 pi update --models`
- **THEN** A1 SHALL refresh the model catalogs under the A1 profile without updating packages, A1, or Pi

#### Scenario: Compatibility package spelling is used
- **WHEN** the user runs a supported package operation through its `a1 pi` spelling
- **THEN** A1 SHALL dispatch the same A1-profile operation as the corresponding direct spelling

#### Scenario: Stable and development updates remain distinct
- **WHEN** the user runs bare `a1 update` or `a1 update --develop [preview-or-version]`
- **THEN** A1 SHALL retain the existing A1 self-update behavior rather than dispatching package work

#### Scenario: A profile is named
- **WHEN** the user supplies a profile flag or project-local scope to a package command
- **THEN** A1 SHALL fail before package work and explain that package commands manage the A1 profile only

### Requirement: Package sources follow Pi's grammar
Package commands SHALL accept the source forms pinned Pi accepts — `npm:<package>`,
git sources by SSH or HTTPS, and local paths — and SHALL NOT invent an A1-specific
source syntax. A source pinned Pi rejects SHALL be rejected by A1 for the same
reason.

#### Scenario: Git source is installed
- **WHEN** the user runs `a1 pi install git:github.com/user/repo`
- **THEN** A1 SHALL install it into the A1 profile the way pinned Pi would install it into its own

#### Scenario: Source is unrecognized
- **WHEN** the user gives a source Pi cannot parse
- **THEN** A1 SHALL report what was wrong with the source and SHALL NOT create or modify anything in the profile

### Requirement: Package operations never reach another profile
A package command SHALL NOT read, create, or modify `<home>/.pi/agent`,
root and its empty resource directories when absent is permitted; nothing else
outside that root is.

#### Scenario: Other profiles are inspected after an install
- **WHEN** any package command completes against the A1 profile

#### Scenario: First install with no profile yet
- **WHEN** `<home>/.a1/agent` does not exist and the user installs a package
- **THEN** A1 SHALL create the profile root and its resource directories, then install into it

### Requirement: Package commands run without the interactive runtime
Package commands SHALL execute in the installed package process and SHALL NOT
materialize a release, start or contact the supervisor, take the foreground lease,
or start an interactive session. They SHALL exit with a status that distinguishes
success from failure.

#### Scenario: Install with no A1 session running
- **WHEN** the user installs a package and no A1 instance is running
- **THEN** A1 SHALL complete the install without starting a supervisor or an interactive profile

#### Scenario: Install while an A1 session is running
- **WHEN** the user installs a package from a second terminal while bare `a1` is running
- **THEN** A1 SHALL complete the install without disturbing the running session's ownership

### Requirement: Package command transcripts match pinned Pi
For an equivalent accepted user-scope package operation, both the preferred direct
form and its supported `a1 pi` compatibility alias SHALL produce the same
package-operation transcript as pinned Pi: the same line sequence, wording,
punctuation, indentation, stdout or stderr destination, and terminal emphasis.
Pi's progress lines and installed paths SHALL be dim, list headings SHALL be bold,
success summaries SHALL be green, and operational failures SHALL be red. Output
inherited from npm, git, or another package-manager child SHALL pass through without
being rewritten or suppressed.

The command namespace and profile are the only intentional contextual differences:
command help and syntax guidance SHALL name the A1 namespace that the user invoked,
and installed paths naturally resolve beneath `<home>/.a1/agent` rather than
`<home>/.pi/agent`. Child-process facts such as package counts, audit totals,
elapsed time, and funding notices SHALL describe the actual A1-profile operation.
A1 SHALL NOT prepend a product-specific summary, append the profile root to Pi's
summary, rename Pi's labels, or add a restart advisory.

#### Scenario: Install succeeds
- **WHEN** `a1 install <source>` or `a1 pi install <source>` completes
- **THEN** the progress line SHALL be dim `Installing <source>...`
- **AND** any child package-manager output SHALL remain in place
- **AND** the final line SHALL be green `Installed <source>` with no following A1-specific line

#### Scenario: Remove succeeds
- **WHEN** a direct or compatibility `remove` command or its `uninstall` alias completes
- **THEN** the progress line SHALL be dim `Removing <source>...`
- **AND** the final line SHALL be green `Removed <source>` with no profile suffix

#### Scenario: Packages are listed
- **WHEN** the A1 profile has user packages and the user runs `a1 list` or `a1 pi list`
- **THEN** the transcript SHALL use Pi's bold `User packages:` heading
- **AND** each source SHALL use Pi's indentation, append ` (filtered)` when filtered, and show its installed path dimmed on the next line
- **AND** it SHALL NOT print an A1-specific heading or the profile root outside an installed path

#### Scenario: No packages are listed
- **WHEN** the A1 profile has no configured packages and the user runs `a1 list` or `a1 pi list`
- **THEN** the complete result SHALL be Pi's dim `No packages installed.` line

#### Scenario: Every package is updated
- **WHEN** `a1 update --extensions` or `a1 pi update --extensions` completes
- **THEN** the final line SHALL be green `Updated packages`

#### Scenario: One package is updated
- **WHEN** `a1 update <source>` or `a1 pi update <source>` completes
- **THEN** the final line SHALL be green `Updated <source>`

### Requirement: Package failures are actionable and preserve Pi parity
When an accepted package operation cannot proceed, A1 SHALL preserve pinned Pi's operational failure format and SHALL NOT print a raw stack trace as the primary message. A missing package manager, an unreachable network, and a source with no matching installed package SHALL each be distinguishable from the message alone. A1 SHALL preserve the full displayed error detail, including multiline whitespace, punctuation, and pinned source suggestions, without independently truncating or flattening it. A1 SHALL use pinned Pi's `Unknown package command error` fallback for a non-Error thrown value.

#### Scenario: Package manager is unavailable
- **WHEN** the underlying package manager cannot be run
- **THEN** A1 SHALL name that as the cause and SHALL NOT leave a partially written profile behind

#### Scenario: Removing something not installed
- **WHEN** the user removes a source that is not configured in the A1 profile
- **THEN** A1 SHALL print red `No matching package found for <source>` to stderr and SHALL exit with a failure status

#### Scenario: An operation throws
- **WHEN** pinned Pi's package manager rejects an accepted operation with a detail
- **THEN** A1 SHALL print red `Error: <detail>` to stderr and SHALL exit with a failure status

#### Scenario: Command guidance is needed
- **WHEN** A1 rejects package-command syntax before an operation begins
- **THEN** command guidance SHALL use the direct `a1` namespace for a direct invocation and the `a1 pi` namespace for a compatibility invocation rather than instructing the user to invoke standalone Pi

#### Scenario: Updating something not installed
- **WHEN** direct or compatibility `update <source>` has no matching user-scope package under pinned Pi's package-identity rules
- **THEN** A1 SHALL preserve Pi's red `Error: No matching package found for <source>` failure and any pinned `Did you mean <suggestion>?` suffix, including punctuation
- **AND** it SHALL exit with status one rather than substitute the remove command's not-found transcript

#### Scenario: Updating an equivalent source spelling
- **WHEN** the requested source identifies a configured user package under pinned Pi's identity rules but differs from its stored source string
- **THEN** A1 SHALL perform the same matching operation and emit the same resulting transcript as pinned Pi for equivalent user settings
- **AND** A1 SHALL NOT reject the source solely because a separate literal or prefix comparison fails

#### Scenario: Operational detail spans multiple lines
- **WHEN** an accepted operation fails with a message containing repeated whitespace, newlines, or more than 600 characters
- **THEN** the displayed detail SHALL remain identical to pinned Pi's detail and SHALL NOT be replaced by an abbreviated summary

### Requirement: Pinned Pi cannot be updated independently
A1 SHALL reject recognized Pi self-update forms because the Pi runtime is pinned to
the certified A1 release. The focused failure SHALL name the supported direct A1,
extension, and model update commands and SHALL NOT append the complete help.

#### Scenario: Bare Pi update is requested
- **WHEN** the user runs `a1 pi update`
- **THEN** A1 SHALL fail before update work and explain that Pi is pinned

#### Scenario: Explicit Pi self-update is requested
- **WHEN** the user runs `a1 pi update --self`, `a1 pi update pi`, or `a1 pi update --all`
- **THEN** A1 SHALL fail before update work and name `a1 update`, `a1 update --extensions`, and `a1 update --models` as supported alternatives

### Requirement: Package syntax and help use pinned presentation for the supported subset
Recognized preferred direct and supported `a1 pi` compatibility package commands SHALL reproduce pinned Pi's diagnostic wording, severity, stream, line order, focused usage formatting, and explicit-help typography for equivalent syntax cases. Invocation text in focused output SHALL match the namespace the user invoked; complete application help, generated usage, and documentation SHALL advertise only direct forms. Help and usage SHALL describe only A1's supported grammar. This contextual substitution SHALL NOT rename ordinary Pi labels or add product summaries.

Pinned-runtime-update restrictions, unsupported project/profile scope, and A1 profile-preparation failures SHALL remain explicit A1-specific diagnostics. Unsupported operations SHALL remain unsupported. Syntax failures SHALL retain A1's exit status two; operational failures SHALL retain exit status one and explicit help SHALL exit zero. Numeric syntax-exit parity with standalone Pi is an intentional exception, not a wording/style exception.

#### Scenario: Install or removal source is missing
- **WHEN** a direct or compatibility `install`, `remove`, or `uninstall` invocation lacks a source
- **THEN** stderr SHALL show red `Missing install source.` or `Missing remove source.` as applicable, followed by dim `Usage: <supported invocation>` for the invoked namespace and a final newline
- **AND** uninstall SHALL use Pi's canonical remove-command diagnostic

#### Scenario: An option is genuinely unknown
- **WHEN** a supported package verb receives an option not recognized by Pi and not reserved by A1's restrictions
- **THEN** stderr SHALL show red `Unknown option <option> for "<canonical verb>".` followed by dim guidance naming `a1 help` and a supported invocation in pinned line order

#### Scenario: An extra positional argument is provided
- **WHEN** a supported package invocation supplies a positional argument beyond the verb's accepted grammar
- **THEN** stderr SHALL show red `Unexpected argument <argument>.` and dim focused usage for the invoked namespace as pinned Pi does
- **AND** the command SHALL perform no package or model work

#### Scenario: Explicit command help is requested
- **WHEN** a supported direct package verb receives `--help` or `-h`
- **THEN** stdout SHALL use Pi's bold `Usage:` heading, section ordering, indentation, and blank rows for the applicable direct A1 command
- **AND** `a1 update --help` SHALL include stable, development, extension, model, and single-package update forms
- **AND** unsupported options, examples, and claims SHALL be omitted rather than made executable or advertised
- **AND** help recognition SHALL precede ordinary syntax failure and operation dispatch

#### Scenario: Explicit compatibility command help is requested
- **WHEN** a supported `a1 pi` package verb receives `--help` or `-h`
- **THEN** stdout SHALL retain focused `a1 pi` compatibility usage with pinned help typography and no unsupported operations

#### Scenario: Pi self-update is requested
- **WHEN** a recognized independent Pi-update form is supplied without explicit help
- **THEN** A1 SHALL retain its pinned-runtime rejection and focused supported alternatives rather than simulate a Pi self-update

### Requirement: User-scope package diagnostics preserve pinned reporting
For equivalent user-scope settings and package-manager behavior, A1 SHALL preserve pinned Pi's diagnostic sequence, warning wording, streams, emphasis, and secondary diagnostic detail in addition to the final operation outcome. Progress and child-process output SHALL retain existing transcript parity. Diagnostics SHALL NOT cause project-local settings or another profile to be read merely to imitate a message.

#### Scenario: User settings report a recoverable error
- **WHEN** equivalent user settings yield a package-command settings error
- **THEN** A1 SHALL report yellow `Warning (package command, <scope> settings): <message>` and the dim secondary stack detail when pinned Pi emits it, before the corresponding package operation output
- **AND** its continuation or failure SHALL follow the equivalent pinned user-scope result

#### Scenario: Project settings are excluded
- **WHEN** project-local settings contain packages, warnings, or trust-requiring resources
- **THEN** A1's user-scope package command SHALL NOT load them, prompt for their trust, mutate them, or synthesize project-scope diagnostics

#### Scenario: Existing success and progress transcripts remain unchanged
- **WHEN** install, remove/uninstall, list, all-package update, or single-package update succeeds
- **THEN** the established pinned success text, dim progress/paths, bold headings, indentation, and inherited child output SHALL remain unchanged
