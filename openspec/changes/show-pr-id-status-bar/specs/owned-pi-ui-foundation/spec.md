## ADDED Requirements

### Requirement: Bare A1 links the current branch's open pull request from the footer

Bare A1 SHALL discover the open GitHub pull request associated with the effective working tree branch and, when one is available, SHALL render `PR<number>` directly after the footer's path and branch. The visible badge SHALL use the established web-link color and SHALL carry the pull request's canonical HTTPS URL as a terminal-native hyperlink so the terminal provides its ordinary hover and Ctrl+click behavior. The path, branch, separator, and session name SHALL remain outside the hyperlink.

Discovery SHALL be asynchronous, bounded, serialized, and optional. Missing GitHub CLI or authentication, detached or mismatched branches, no open pull request, malformed or unsafe output, command failure, and timeout SHALL leave the existing footer unchanged and SHALL NOT block startup or fail the session. A running session SHALL refresh the association at a bounded cadence and SHALL release its timer and active probe on disposal.

The badge is a declared bare-A1 addition. The `a1 pi` comparison profile SHALL retain its pinned footer bytes and SHALL NOT render the badge.

#### Scenario: Show an open branch pull request

- **WHEN** bare A1 runs in a Git working tree whose current branch has an open pull request numbered 567 at `https://github.com/example/project/pull/567`
- **THEN** the footer path row SHALL contain `path (branch) PR567`
- **AND** only `PR567` SHALL be an OSC 8 hyperlink targeting that canonical URL
- **AND** its visible text SHALL use the same theme role as established web links

#### Scenario: Keep surrounding footer text outside the link

- **WHEN** the footer also has a session name
- **THEN** the row SHALL order path, branch, PR badge, and session name as `path (branch) PR<number> • session-name`
- **AND** the path, branch, spaces, separator, and session name SHALL NOT resolve to the PR target

#### Scenario: No open pull request is available

- **WHEN** the current directory is not a Git repository, the head is detached, no open PR matches the current branch, or GitHub CLI discovery fails, times out, or returns invalid data
- **THEN** the footer SHALL retain its existing path, branch, and session-name presentation without a PR badge
- **AND** startup and the running agent session SHALL continue without a PR-discovery diagnostic

#### Scenario: Pull request association changes during the session

- **WHEN** a bounded refresh observes that the current branch gains, loses, or changes its open pull request association
- **THEN** the footer SHALL update to the newest normalized identity
- **AND** unchanged refreshes SHALL NOT cause redundant view updates
- **AND** no two discovery processes SHALL overlap

#### Scenario: Dispose while discovery is pending

- **WHEN** the session is disposed with a refresh timer or PR discovery process pending
- **THEN** the timer and process SHALL be cancelled or released
- **AND** a late result SHALL NOT update or render the disposed session

#### Scenario: Render a narrow footer

- **WHEN** the linked PR badge reaches the footer's truncation boundary
- **THEN** the rendered row SHALL remain within its declared width
- **AND** hyperlink and foreground state SHALL close at the truncation boundary without extending to another cell or row

#### Scenario: Use the pinned comparison profile

- **WHEN** the same footer state is rendered through `a1 pi`
- **THEN** its output SHALL match the pinned footer without a PR badge or PR hyperlink
