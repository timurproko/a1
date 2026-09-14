## ADDED Requirements

### Requirement: Model refresh command transcripts match pinned Pi
For equivalent profile contents and refresh results, `a1 update --models` and `a1 pi update --models` SHALL emit identical transcripts matching the repository's pinned Pi `update --models` command. Parity SHALL include wording, punctuation, line breaks, stdout/stderr destination, terminal-aware ANSI styling, and exit status. A1 SHALL NOT append its profile root, prepend product branding, or add an advisory to these summaries. A1 self-update and development-preview output SHALL remain outside this model-refresh contract.

#### Scenario: Model refresh succeeds
- **WHEN** either alias completes model-catalog refresh successfully
- **THEN** stdout SHALL contain exactly green `Model catalogs refreshed` followed by one newline, stderr SHALL be empty, and the exit status SHALL be zero
- **AND** there SHALL be no period, checkmark, product prefix, path suffix, or additional blank line

#### Scenario: Model refresh times out
- **WHEN** the refresh reaches its pinned timeout and reports an aborted result
- **THEN** stderr SHALL contain red `Error: Model catalog refresh timed out.` followed by one newline and the exit status SHALL be one
- **AND** stdout SHALL NOT contain a success summary

#### Scenario: Provider catalogs fail to refresh
- **WHEN** refresh returns one or more provider errors
- **THEN** stderr SHALL contain red `Error: Could not refresh model catalogs: <details>` followed by one newline, with each detail formatted as `<provider>: <message>` in pinned order and joined by `; `
- **AND** the command SHALL exit with status one without reporting success

#### Scenario: Model refresh throws another error
- **WHEN** model-runtime creation or refresh throws
- **THEN** the command SHALL use pinned Pi's `Error: <message>` formatting and `Unknown model catalog refresh error` fallback for a non-Error thrown value
- **AND** it SHALL preserve the displayed error message rather than whitespace-normalizing or truncating it independently

#### Scenario: Color is disabled or output is redirected
- **WHEN** both producers run with equivalent terminal and color-control settings
- **THEN** A1 SHALL follow pinned Pi's color-enablement behavior, including plain text without escape sequences when color is disabled
- **AND** changing color availability SHALL NOT change wording, streams, or newline count

#### Scenario: Refresh remains profile-local and non-interactive
- **WHEN** either model-refresh alias runs
- **THEN** it SHALL use only A1's selected profile and SHALL NOT update packages, update either executable, launch the UI, or contact the supervisor
