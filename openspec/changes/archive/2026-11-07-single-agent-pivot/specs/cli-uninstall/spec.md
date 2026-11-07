## ADDED Requirements

### Requirement: One command removes A1 from the machine without stopping other processes
`a1 uninstall` without a package source SHALL remove the global `@timurproko/a1` package and its launchers from the npm global prefix and the user-prefix fallback and delete A1-owned releases, runtime state, caches, dependency layers, and certification records, touching only A1-owned paths and never contacting or stopping other processes. User data SHALL be removed only after one interactive confirmation or with `--purge`; `--yes` SHALL skip only the program-removal confirmation.

#### Scenario: A user uninstalls A1
- **WHEN** the user runs `a1 uninstall` and confirms
- **THEN** the `a1` command SHALL no longer resolve and A1-owned program files SHALL be gone
- **AND** sessions and settings SHALL remain unless the user also confirmed their removal

#### Scenario: A user purges everything
- **WHEN** the user runs `a1 uninstall --yes --purge`
- **THEN** A1's program files, runtime state, sessions, and settings SHALL all be removed without prompting

#### Scenario: A package source is supplied
- **WHEN** the user runs `a1 uninstall npm:pi-mcp-adapter`
- **THEN** A1 SHALL remove only that package as `a1 remove` does

#### Scenario: No terminal is available
- **WHEN** the command runs without a terminal and without `--yes`
- **THEN** it SHALL fail before removal and name `--yes`

#### Scenario: Removal finishes
- **WHEN** program removal succeeds
- **THEN** A1 SHALL print one result line naming what was kept, if anything

#### Scenario: Another session is running
- **WHEN** an A1 session runs in another terminal during uninstall
- **THEN** that process SHALL NOT be contacted or stopped and SHALL keep executing its retained release until it exits

## REMOVED Requirements

### Requirement: One command removes A1 from the machine
**Reason**: There are no resident hosts or supervisors to stop.

**Migration**: None.
