## ADDED Requirements

### Requirement: Sole public command exposes self-update
AddOne SHALL recognize `update` as a non-interactive subcommand through the sole public `a1` executable.

#### Scenario: Update through a1
- **WHEN** the user invokes `a1 update`
- **THEN** AddOne SHALL run the self-update workflow

## MODIFIED Requirements

### Requirement: Update uses the authoritative npm release
The self-update workflow SHALL resolve the `latest` release of `@timurproko/a1` from the configured npm registry and SHALL globally install it only when it is newer than the running release. AddOne MUST use cross-platform process execution with fixed argument arrays and MUST NOT construct an interpolated shell command string.

#### Scenario: A newer release is available
- **WHEN** npm reports a latest `@timurproko/a1` version newer than the running version
- **THEN** AddOne SHALL globally install the resolved `@timurproko/a1` release and report the running and target versions

#### Scenario: The installed release is current
- **WHEN** npm reports a latest `@timurproko/a1` version that is equal to or older than the running version
- **THEN** AddOne SHALL report that it is already current and exit successfully without reinstalling

## REMOVED Requirements

### Requirement: Both public commands expose self-update
**Reason**: The obsolete `addone` executable is removed and `a1` becomes the sole public command.

**Migration**: No installed-user migration is required. Invoke `a1 update` from the new `@timurproko/a1` package.
