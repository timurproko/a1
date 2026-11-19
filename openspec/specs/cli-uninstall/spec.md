# cli-uninstall Specification

## Purpose
TBD - created by archiving change reliable-install-and-update. Update Purpose after archive.

## Requirements

### Requirement: One command removes A1 from the machine without stopping other processes
`a1 uninstall` without a package source SHALL remove the global `@timurproko/a1` package and its launchers through npm from the npm prefix that holds the running installation, then delete A1's data, configuration, and runtime state directories, never contacting or stopping other processes. It SHALL accept only `--yes` and `--purge`, each at most once. It SHALL refuse with status 1 when the running package is not inside an npm global `node_modules` tree. It SHALL never delete a filesystem root, the user's home directory, or a directory that contains the home directory.

Without `--yes`, A1 SHALL ask whether to remove the program, and after a yes SHALL ask whether to also delete sessions, settings, and sign-ins in the profile home; declining the first question SHALL remove nothing and exit 1. With `--yes` neither question SHALL be asked. The profile home SHALL be deleted only when the second question is answered yes or `--purge` is given.

#### Scenario: A user uninstalls A1
- **WHEN** the user runs `a1 uninstall` and confirms
- **THEN** the `a1` command SHALL no longer resolve and A1's package and state directories SHALL be gone
- **AND** sessions and settings SHALL remain unless the user also confirmed their removal

#### Scenario: A user purges everything
- **WHEN** the user runs `a1 uninstall --yes --purge`
- **THEN** A1's program files, runtime state, sessions, and settings SHALL all be removed without prompting

#### Scenario: A package source is supplied
- **WHEN** the user runs `a1 uninstall npm:pi-mcp-adapter`
- **THEN** A1 SHALL remove only that package as `a1 remove` does

#### Scenario: No terminal is available
- **WHEN** the command runs without a terminal and without `--yes`
- **THEN** it SHALL fail with status 2 before removal and name `--yes`

#### Scenario: Removal finishes
- **WHEN** program removal succeeds
- **THEN** A1 SHALL print one result line, which names the kept profile home when sessions and settings were kept

#### Scenario: Another session is running
- **WHEN** an A1 session runs in another terminal during uninstall
- **THEN** that process SHALL NOT be contacted or stopped

#### Scenario: A1 runs from a checkout
- **WHEN** `a1 uninstall` runs from a package that is not inside an npm global `node_modules` tree
- **THEN** it SHALL exit 1 with a diagnostic and remove nothing

#### Scenario: npm cannot remove the package
- **WHEN** the npm removal fails
- **THEN** A1 SHALL exit 1, name the manual `npm uninstall --global` command, and delete no state directory
