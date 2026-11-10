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
