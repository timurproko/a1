## Purpose

Defines a safe, discoverable CLI workflow for replacing a globally installed AddOne release with the latest release published through its authoritative npm package.

## ADDED Requirements

### Requirement: Both public commands expose self-update
AddOne SHALL recognize `update` as a non-interactive subcommand through both the `addone` and `a1` executable aliases.

#### Scenario: Update through full command
- **WHEN** the user invokes `addone update`
- **THEN** AddOne runs the self-update workflow

#### Scenario: Update through short alias
- **WHEN** the user invokes `a1 update`
- **THEN** AddOne runs the same self-update workflow

### Requirement: Update uses the authoritative npm release
The self-update workflow SHALL resolve the `latest` release of `@timurproko/addone` from the configured npm registry and SHALL globally install it only when it is newer than the running release. AddOne MUST use cross-platform process execution with fixed argument arrays and MUST NOT construct an interpolated shell command string.

#### Scenario: A newer release is available
- **WHEN** npm reports a latest AddOne version newer than the running version
- **THEN** AddOne globally installs the resolved release and reports the running and target versions

#### Scenario: The installed release is current
- **WHEN** npm reports a latest AddOne version that is equal to or older than the running version
- **THEN** AddOne reports that it is already current and exits successfully without reinstalling

### Requirement: Self-update is limited to the managed global installation
AddOne SHALL verify through npm's global package root that the running package is managed by the active global npm installation before replacing it. It SHALL refuse automatic replacement when running from a local checkout, npm link, or a different package-manager context.

#### Scenario: Running package is globally managed by npm
- **WHEN** the running AddOne package is contained by the canonical global npm package root
- **THEN** AddOne may perform the global update

#### Scenario: Running package is not managed by global npm
- **WHEN** the running AddOne package is outside the canonical global npm package root
- **THEN** AddOne exits unsuccessfully and prints the manual npm installation command without modifying any installation

### Requirement: Update is isolated from the interactive runtime
The update subcommand SHALL complete or fail without starting the AddOne supervisor, attaching to an existing supervisor, launching the TUI, or launching an agent.

#### Scenario: Update is requested while no supervisor exists
- **WHEN** the user invokes the update subcommand
- **THEN** only the npm update workflow runs and no supervisor endpoint is created

### Requirement: Update failures are actionable
AddOne SHALL stream relevant npm diagnostics and exit unsuccessfully when registry lookup, npm startup, permission acquisition, or global installation fails. It MUST NOT report a successful update unless npm completed the requested global installation successfully.

#### Scenario: npm is unavailable
- **WHEN** the platform npm executable cannot be started
- **THEN** AddOne reports that npm could not be executed and exits unsuccessfully

#### Scenario: Global installation is rejected
- **WHEN** npm rejects installation because of permissions, network access, registry policy, or package validation
- **THEN** AddOne preserves npm diagnostics, reports that the update failed, and exits with an unsuccessful status
