## MODIFIED Requirements

### Requirement: Package commands manage the A1 profile only
`a1 install <source>`, `a1 remove <source>`, its alias `a1 uninstall <source>`,
`a1 list`, `a1 update --extensions`, `a1 update <source>`, and `a1 update
--models` SHALL be the preferred package and model commands and SHALL operate on
A1's own profile. The corresponding supported `a1 pi install`, `remove`,
`uninstall`, `list`, and `update` forms SHALL remain compatibility aliases that
produce the same operation requests and outcomes. Model refresh SHALL NOT update
packages, A1, or Pi.

Project-local package mutation and package configuration SHALL NOT be supported or
advertised: a profile flag, `-l`, or `--local` SHALL be rejected, and `a1 config`
SHALL fail with a diagnostic saying the command is not available.

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
- **WHEN** the user runs bare `a1 update`, `a1 update --release`, or `a1 update --develop [preview-or-version]`
- **THEN** A1 SHALL run A1 self-update rather than dispatching package work

#### Scenario: A profile is named
- **WHEN** the user supplies a profile flag or project-local scope to a package command
- **THEN** A1 SHALL fail with status 2 before package work and explain that package commands manage the A1 profile only

### Requirement: Package operations never reach another profile
A package command SHALL NOT read, create, or modify `<home>/.pi/agent` or any
other profile. Creating the A1 profile root and its empty resource directories
when absent is permitted; nothing else outside that root is. When the profile
cannot be prepared the command SHALL fail with status 1 and a diagnostic naming
the profile root.

#### Scenario: Other profiles are inspected after an install
- **WHEN** any package command completes against the A1 profile
- **THEN** `<home>/.pi/agent` SHALL be unchanged and SHALL NOT have been created

#### Scenario: First install with no profile yet
- **WHEN** `<home>/.a1/agent` does not exist and the user installs a package
- **THEN** A1 SHALL create the profile root and its resource directories, then install into it

### Requirement: Package commands run without the interactive runtime
Package commands SHALL execute in the installed package process and SHALL NOT
materialize a release or start an interactive session. They SHALL exit 0 on
success, 1 on an operational failure, and 2 on a syntax failure.

#### Scenario: Install with no A1 session running
- **WHEN** the user installs a package and no A1 instance is running
- **THEN** A1 SHALL complete the install without starting an interactive profile or a background A1 process

#### Scenario: Install while an A1 session is running
- **WHEN** the user installs a package from a second terminal while bare `a1` is running
- **THEN** A1 SHALL complete the install without contacting the running session

### Requirement: Package command transcripts match pinned Pi
For an accepted user-scope package operation, the preferred direct form and its
supported `a1 pi` compatibility alias SHALL produce the same transcript, using
pinned Pi's wording, punctuation, indentation, stdout or stderr destination, and
terminal emphasis. Pi's progress lines and installed paths SHALL be dim, progress
warnings SHALL be yellow, list headings SHALL be bold, success summaries SHALL be
green, and operational failures SHALL be red. Output inherited from npm, git, or
another package-manager child SHALL pass through without being rewritten or
suppressed.

The command namespace and profile are the only contextual differences: command
help and syntax guidance SHALL name the A1 namespace that the user invoked, and
installed paths resolve beneath `<home>/.a1/agent` rather than `<home>/.pi/agent`.
A1 SHALL NOT prepend a product-specific summary, append the profile root to the
summary, rename Pi's labels, or add a restart advisory.

An update summary SHALL report what changed: a green `Updated <n> package:` or
`Updated <n> packages:` heading followed by one two-space-indented line per
change; green `<source> is already up to date` or `Packages are already up to
date` when nothing changed; yellow `<source> was not updated, see the warnings
above` or `No packages were updated, see the warnings above` when nothing changed
and warnings were reported; and yellow `Skipped package updates (offline mode)`
when `PI_OFFLINE` is truthy.

#### Scenario: Install succeeds
- **WHEN** `a1 install <source>` or `a1 pi install <source>` completes
- **THEN** Pi's progress lines SHALL be dim
- **AND** any child package-manager output SHALL remain in place
- **AND** the final line SHALL be green `Installed <source>` with no following A1-specific line

#### Scenario: Remove succeeds
- **WHEN** a direct or compatibility `remove` command or its `uninstall` alias completes
- **THEN** Pi's progress lines SHALL be dim
- **AND** the final line SHALL be green `Removed <source>` with no profile suffix

#### Scenario: Packages are listed
- **WHEN** the A1 profile has user packages and the user runs `a1 list` or `a1 pi list`
- **THEN** the transcript SHALL use Pi's bold `User packages:` heading
- **AND** each source SHALL be indented two spaces, append ` (filtered)` when filtered, and show its installed path dimmed and indented four spaces on the next line
- **AND** it SHALL NOT print an A1-specific heading or the profile root outside an installed path

#### Scenario: No packages are listed
- **WHEN** the A1 profile has no configured packages and the user runs `a1 list` or `a1 pi list`
- **THEN** the complete result SHALL be the dim `No packages installed.` line

#### Scenario: Every package is updated
- **WHEN** `a1 update --extensions` or `a1 pi update --extensions` changes two packages
- **THEN** the summary SHALL be green `Updated 2 packages:` followed by one indented line per change

#### Scenario: One package is updated
- **WHEN** `a1 update <source>` or `a1 pi update <source>` completes and that package was already current
- **THEN** the final line SHALL be green `<source> is already up to date`

#### Scenario: Updates are skipped offline
- **WHEN** an update command runs with `PI_OFFLINE=1`
- **THEN** the final line SHALL be yellow `Skipped package updates (offline mode)`
