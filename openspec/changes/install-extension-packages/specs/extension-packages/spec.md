## ADDED Requirements

### Requirement: Package commands manage the A1 profile only
`a1 pi install <source>`, `a1 pi remove <source>`, its alias `a1 pi uninstall <source>`, and
`a1 pi list` SHALL resolve the normal A1 profile root at `<home>/.a1/agent` and operate
on it alone. Installing SHALL place package content under that root and record the
source in that root's `settings.json`, so the next bare `a1` loads it. No package
command SHALL accept a profile prefix, profile flag, or project scope; the vanilla
Pi profile is managed by Pi itself and the sandbox profile takes no installs.

#### Scenario: Install an npm package
- **WHEN** the user runs `a1 pi install npm:pi-mcp-adapter`
- **THEN** A1 SHALL install the package beneath `<home>/.a1/agent` and add its source to that profile's settings
- **AND** the next bare `a1` SHALL load the extension the package provides

#### Scenario: Remove an installed package
- **WHEN** the user runs `a1 pi remove npm:pi-mcp-adapter` or `a1 pi uninstall npm:pi-mcp-adapter`
- **THEN** A1 SHALL remove the installed content and the settings entry from the A1 profile
- **AND** both spellings SHALL behave identically

#### Scenario: List installed packages
- **WHEN** the user runs `a1 pi list`
- **THEN** A1 SHALL report the packages configured in the A1 profile with where each is installed
- **AND** SHALL say plainly that none are installed rather than printing nothing

#### Scenario: A profile is named
- **WHEN** the user runs a package command with `pi`, `sandbox`, or a profile flag
- **THEN** A1 SHALL exit with a usage error explaining that package commands manage the A1 profile and that Pi manages its own

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
`<home>/.a1/sandbox`, or any project-local Pi configuration. Creating the A1 profile
root and its empty resource directories when absent is permitted; nothing else
outside that root is.

#### Scenario: Other profiles are inspected after an install
- **WHEN** any package command completes against the A1 profile
- **THEN** `<home>/.pi/agent` and `<home>/.a1/sandbox` SHALL be byte-for-byte unchanged

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
For an equivalent accepted user-scope package operation, `a1 pi` SHALL produce the
same package-command transcript as pinned Pi: the same line sequence, wording,
punctuation, indentation, stdout or stderr destination, and terminal emphasis. Pi's
progress lines and installed paths SHALL be dim, list headings SHALL be bold,
success summaries SHALL be green, and operational failures SHALL be red. Output
inherited from npm, git, or another package-manager child SHALL pass through without
being rewritten or suppressed.

The command namespace and profile are the only intentional contextual differences:
the user invokes `a1 pi` rather than `pi`, and installed paths naturally resolve
beneath `<home>/.a1/agent` rather than `<home>/.pi/agent`. Child-process facts such as
package counts, audit totals, elapsed time, and funding notices SHALL describe the
actual A1-profile operation. A1 SHALL NOT prepend a product-specific summary, append
the profile root to Pi's summary, rename Pi's labels, or add a restart advisory.

#### Scenario: Install succeeds
- **WHEN** `a1 pi install <source>` completes
- **THEN** the progress line SHALL be dim `Installing <source>...`
- **AND** any child package-manager output SHALL remain in place
- **AND** the final line SHALL be green `Installed <source>` with no following A1-specific line

#### Scenario: Remove succeeds
- **WHEN** `a1 pi remove <source>` or its `uninstall` alias completes
- **THEN** the progress line SHALL be dim `Removing <source>...`
- **AND** the final line SHALL be green `Removed <source>` with no profile suffix

#### Scenario: Packages are listed
- **WHEN** the A1 profile has user packages and the user runs `a1 pi list`
- **THEN** the transcript SHALL use Pi's bold `User packages:` heading
- **AND** each source SHALL use Pi's indentation, append ` (filtered)` when filtered, and show its installed path dimmed on the next line
- **AND** it SHALL NOT print an A1-specific heading or the profile root outside an installed path

#### Scenario: No packages are listed
- **WHEN** the A1 profile has no configured packages and the user runs `a1 pi list`
- **THEN** the complete result SHALL be Pi's dim `No packages installed.` line

#### Scenario: Every package is updated
- **WHEN** `a1 pi update --extensions` completes
- **THEN** the final line SHALL be green `Updated packages`

#### Scenario: One package is updated
- **WHEN** `a1 pi update <source>` completes
- **THEN** the final line SHALL be green `Updated <source>`

### Requirement: Package failures are actionable and preserve Pi parity
When an accepted package operation cannot proceed, A1 SHALL preserve pinned Pi's
operational failure format and SHALL NOT print a raw stack trace as the primary
message. A missing package manager, an unreachable network, and a source with no
matching installed package SHALL each be distinguishable from the message alone.

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
- **THEN** any command guidance SHALL use the `a1 pi` namespace rather than instructing the user to invoke standalone Pi
