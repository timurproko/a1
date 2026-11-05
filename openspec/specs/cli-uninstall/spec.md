# cli-uninstall Specification

## Purpose
TBD - created by archiving change reliable-install-and-update. Update Purpose after archive.

## Requirements

### Requirement: One command removes A1 from the machine
`a1 uninstall` without a package source SHALL remove A1 from the machine. It SHALL stop every A1 resident namespace through the host-stop command of the release that owns it, end A1 supervisors and launch processes, remove the global `@timurproko/a1` package and its launchers from both the npm global prefix and the user prefix fallback, and delete A1-owned releases, runtime state, caches, dependency layers, and certification records. It SHALL remove only A1-owned paths.

Sessions, prompt history, and settings SHALL be removed only after the user confirms a single interactive question, or when `--purge` is supplied. `--yes` SHALL skip the program-removal confirmation and keep user data unless `--purge` is also supplied. Without a terminal and without `--yes`, the command SHALL fail before removal and name `--yes`. On success it SHALL print one result line naming what was kept, if anything.

#### Scenario: A user uninstalls A1
- **WHEN** the user runs `a1 uninstall` and confirms
- **THEN** no A1 process SHALL remain running and the `a1` command SHALL no longer resolve
- **AND** sessions and settings SHALL remain unless the user also confirmed their removal

#### Scenario: A user purges everything
- **WHEN** the user runs `a1 uninstall --yes --purge`
- **THEN** A1's program files, runtime state, sessions, and settings SHALL all be removed without prompting

#### Scenario: A resident Agent is running
- **WHEN** `a1 uninstall` runs while a resident Agent is active
- **THEN** the confirmation SHALL say that running Agents will stop, and their sessions SHALL stay resumable unless purged

#### Scenario: A package source is supplied
- **WHEN** the user runs `a1 uninstall npm:pi-mcp-adapter`
- **THEN** A1 SHALL remove only that package as `a1 remove` does
