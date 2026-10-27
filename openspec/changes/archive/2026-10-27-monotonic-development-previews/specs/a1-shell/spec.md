# a1-shell Delta

## MODIFIED Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the stable update command
resolving npm tag `latest`, and `a1 update --develop` as the development-preview
update command resolving the internal npm development dist-tag. A positive preview
number or full numbered preview version MAY follow `--develop` to select one
immutable publication; the preview number is the pull request number recorded in a
published preview's manifest, or the trailing number of a preview published before
pull requests were recorded. Invocation SHALL authorize the existing ownership-safe
replacement transaction and return to the invoking shell after reporting its final
result.

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
- **WHEN** the user runs `a1 update --develop 828` and exactly one published preview records pull request 828 or ends in `-dev.828`
- **THEN** A1 SHALL install that exact immutable preview

#### Scenario: Replace with an exact preview
- **WHEN** the user runs `a1 update --develop 0.2.7-dev.1218` and that preview is published
- **THEN** A1 SHALL install exactly `0.2.7-dev.1218`

#### Scenario: Removed update notation is used
- **WHEN** the user runs `a1 update:develop`, `a1 update:107`, `a1 update:0.1.8-dev.107`, or `a1 update self`
- **THEN** A1 SHALL exit successfully without output or side effects

### Requirement: Version output follows the Pi command convention
The installed application SHALL expose `a1 version` as the preferred version command and SHALL retain equivalent `a1 --version` and `a1 -v` compatibility forms. None of those forms SHALL start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction. A stable release SHALL report `Current` and `Release` in that order. A development build SHALL report `Current`, `Develop`, and `Release` in that order. Both SHALL discover authoritative package dist-tags as one coherent result; an absent development tag SHALL be unavailable without a diagnostic, while discovery failure SHALL make every remote field unavailable with one concise `A1` diagnostic, keep the `Current` line, and exit successfully.

A development build SHALL append the recorded pull request to its `Current` line as ` (#<number>)` when its installed manifest records one, and to its `Develop` line when the development head's published manifest records one and that manifest can be read within the discovery budget. A missing or unreadable record SHALL leave the bare version on that line without a diagnostic. Stable lines SHALL NOT carry a pull request.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from stable release `0.3.0` and the `latest` dist-tag is `0.3.1`
- **THEN** every form SHALL print `Current: 0.3.0` followed by `Release: 0.3.1`
- **AND** it SHALL NOT print a `Develop` line

#### Scenario: Stable release version without registry access
- **WHEN** the user runs `a1 version` from a stable release and dist-tag discovery fails
- **THEN** A1 SHALL print `Current: <installed version>` and `Release: unavailable`, emit one concise `A1` diagnostic, and exit successfully

#### Scenario: Development build versions
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from a development build
- **THEN** every form SHALL display the same `Current`, `Develop`, and `Release` result in order, applying the declared unavailable behavior when remote channel metadata is absent or unreachable

#### Scenario: Development build with recorded pull requests
- **WHEN** the user runs `a1 version` from `0.2.7-dev.1217` whose manifest records pull request 842 and the `next` dist-tag is `0.2.7-dev.1218` whose manifest records pull request 828
- **THEN** A1 SHALL print `Current: 0.2.7-dev.1217 (#842)`, `Develop: 0.2.7-dev.1218 (#828)`, and the `Release` line

#### Scenario: Development build without a recorded pull request
- **WHEN** the installed or head manifest records no pull request, or the head manifest cannot be read
- **THEN** that line SHALL print the bare version and A1 SHALL emit no diagnostic for the missing record

#### Scenario: Old subcommand notation
- **WHEN** the user runs the formerly unsupported `a1 version` notation
- **THEN** A1 SHALL now treat it as the preferred equivalent of `a1 --version` and `a1 -v`
