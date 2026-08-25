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

### Requirement: A newly installed package is announced as pending
A running A1 session SHALL NOT be required to notice a package installed beneath it.
On success, the command SHALL state that the change takes effect the next time A1
starts, so a user who sees no new commands in a running session knows why.

#### Scenario: Install succeeds
- **WHEN** an install completes
- **THEN** A1 SHALL confirm what was installed and SHALL say that a restart is needed for a running session to load it

### Requirement: Package failures are actionable
When an operation cannot proceed, A1 SHALL report the cause in its own voice and
SHALL NOT print a raw stack trace as the primary message. A missing package manager,
an unreachable network, and a source with no matching installed package SHALL each
be distinguishable from the message alone.

#### Scenario: Package manager is unavailable
- **WHEN** the underlying package manager cannot be run
- **THEN** A1 SHALL name that as the cause and SHALL NOT leave a partially written profile behind

#### Scenario: Removing something not installed
- **WHEN** the user removes a source that is not configured in the A1 profile
- **THEN** A1 SHALL say no matching package was found and SHALL exit with a failure status

#### Scenario: Diagnostics are read
- **WHEN** any package command reports success, refusal, or failure
- **THEN** the message SHALL use A1's own command names and SHALL NOT instruct the user to run a Pi command instead
