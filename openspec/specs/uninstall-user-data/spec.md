# uninstall-user-data Specification

## Purpose
Decides when `a1 uninstall` removes the user's sessions, settings and sign-ins.

## Requirements

### Requirement: Uninstall keeps user data unless purged

Interactive `a1 uninstall` SHALL ask only whether to remove A1 and SHALL NOT ask whether to delete user data. It SHALL remove the profile home with sessions, settings and sign-ins only when `--purge` is given; `--yes` SHALL keep skipping the removal question.

#### Scenario: Interactive uninstall without purge

- **WHEN** a user runs `a1 uninstall` and answers yes
- **THEN** A1 is removed, no second question is asked, and the profile home remains

#### Scenario: Purge requested

- **WHEN** a user runs `a1 uninstall --purge` and answers yes
- **THEN** A1 and the profile home are removed
