## ADDED Requirements

### Requirement: Successful in-session model changes use the status bar as confirmation

Bare A1 SHALL update its existing active-model and thinking-level status presentation after a successful in-session model change without adding a redundant successful-switch transcript row or dock notice. This SHALL apply to model picker selection, direct active-model switching, and scoped model cycling where available. Suppression SHALL be based on the semantic action and successful outcome, not matching rendered English message text. Model persistence, session events, and authoritative model state SHALL remain unchanged.

Failures and actionable warnings, including catalog refresh problems, SHALL remain visible. Canceled model selection SHALL remain quiet. Unrelated workflow output and comparison-profile success messages SHALL retain their existing behavior.

#### Scenario: Select a different model

- **WHEN** the reader successfully changes the active model through the unified Models dialog
- **THEN** the status bar SHALL reflect the selected model and effective thinking level
- **AND** no redundant successful model-switch message SHALL appear above the editor or in the transcript

#### Scenario: Switch directly or cycle

- **WHEN** a direct active-model command or an available scoped cycling action successfully changes the model
- **THEN** the existing status presentation SHALL update without a redundant success notice

#### Scenario: Report a model failure or warning

- **WHEN** model selection fails or produces an actionable warning
- **THEN** the failure or warning SHALL remain visible through the existing diagnostic presentation
- **AND** successful-switch suppression SHALL NOT hide it

#### Scenario: Preserve comparison output

- **WHEN** the comparison profile changes the active model
- **THEN** its existing success-message and status-update behavior SHALL remain unchanged

### Requirement: The first-row PR link follows a dim dot separator

Bare A1 SHALL render its first footer row as `path (branch) • #900` when a path, branch, and PR 900 are available. The ` • ` separator SHALL use the existing dim footer role and remain outside the PR hyperlink; only the complete PR badge SHALL retain the established link color and canonical URL. This SHALL supersede the prior space-only separator immediately before the PR badge without moving the link or the second-row session name.

Constrained widths SHALL reserve a complete PR badge before path/branch text. The separator SHALL appear only when a nonempty path prefix fits beside the complete badge; otherwise the row SHALL show the badge alone, or safely truncate it when the entire badge cannot fit. An absent PR SHALL add neither a separator nor an empty badge. Comparison-profile footer output SHALL remain unchanged.

#### Scenario: Render a normal-width PR link

- **WHEN** bare A1 has a path, branch, and linked PR and enough footer width
- **THEN** the first row SHALL contain the path and branch followed by ` • ` and the linked PR number
- **AND** the separator SHALL remain dim and outside the hyperlink

#### Scenario: Clip the path before the PR

- **WHEN** a complete PR badge and a nonempty clipped path prefix fit but the full path and branch do not
- **THEN** the path prefix SHALL truncate safely before ` • ` and the complete linked badge

#### Scenario: Show the badge without a dangling separator

- **WHEN** the row can fit the complete PR badge but no path prefix and separator
- **THEN** the badge SHALL remain complete and linked without a leading dot
- **AND** even smaller widths SHALL truncate safely without leaking hyperlink state

#### Scenario: Omit the PR segment or use comparison presentation

- **WHEN** no PR is available or the comparison profile renders its footer
- **THEN** no new PR separator SHALL be added and existing profile-specific presentation SHALL remain intact
