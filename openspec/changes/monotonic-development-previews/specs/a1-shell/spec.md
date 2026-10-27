# a1-shell Delta

## MODIFIED Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the stable update command
resolving npm tag `latest`, and `a1 update --develop` as the development-preview
update command resolving the internal npm development dist-tag. A positive preview
number or full numbered preview version MAY follow `--develop` to select one
immutable publication; the preview number is the pull request number, which is the
last identifier of a published preview version in either the `X.Y.Z-dev.<pr>` or the
`X.Y.Z-dev.<count>.<pr>` shape. Invocation SHALL authorize the existing
ownership-safe replacement transaction and return to the invoking shell after
reporting its final result.

The application SHALL NOT expose any `update:<selector>` command or `a1 update self`
alias. Removed forms SHALL be unsupported silent no-ops and SHALL NOT resolve the
registry, start the supervisor, install anything, or print migration guidance.

#### Scenario: Replace the current preview
- **WHEN** the user runs `a1 update --develop` while an older verified A1 cohort is active
- **THEN** A1 SHALL perform the replacement transaction using the exact version selected by the internal development dist-tag and return to the terminal prompt

#### Scenario: Selected channel is current
- **WHEN** the selected npm tag resolves to the exact active A1 release version
- **THEN** A1 SHALL report that the channel is current without reinstalling it

#### Scenario: Ownership cannot be verified
- **WHEN** A1 cannot prove that a process belongs to the active cohort
- **THEN** the update SHALL fail safely without terminating that process or deleting control state

#### Scenario: Update is interrupted
- **WHEN** an update is interrupted after a durable transaction phase
- **THEN** the next invocation SHALL continue or roll back to one verified active cohort without manual cleanup

#### Scenario: Another target was interrupted by a process that is gone
- **WHEN** the user runs `a1 update --develop 828` while the update lease names a process that is no longer alive and the durable transaction targets `0.2.7-dev.835`
- **THEN** A1 SHALL roll that transaction back to its prior verified cohort, say that the interrupted `0.2.7-dev.835` update was rolled back, and install preview 828 in the same invocation

#### Scenario: Launch after a completed update
- **WHEN** the user runs bare `a1` after the update command reported success
- **THEN** A1 SHALL launch the already active target without printing installation or activation messages

#### Scenario: Replace with a numbered preview
- **WHEN** the user runs `a1 update --develop 107` and exactly one published preview ends in `-dev.107` or `-dev.<count>.107`
- **THEN** A1 SHALL install that exact immutable preview

#### Scenario: Replace with an exact preview
- **WHEN** the user runs `a1 update --develop 0.1.8-dev.107` or `a1 update --develop 0.2.7-dev.1218.828` and that preview is published
- **THEN** A1 SHALL install exactly that version

#### Scenario: Removed update notation is used
- **WHEN** the user runs `a1 update:develop`, `a1 update:107`, `a1 update:0.1.8-dev.107`, or `a1 update self`
- **THEN** A1 SHALL exit successfully without output or side effects
